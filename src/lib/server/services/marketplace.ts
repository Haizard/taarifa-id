import { and, desc, eq, inArray, notInArray, or, sql } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, conflict, forbidden, notFound } from '../errors';

type Category = typeof schema.serviceCategoryEnum.enumValues[number];
type FormField = schema.ServiceFormField;

const categories: Category[] = ['hospital', 'school', 'garage'];
const fieldTypes = ['text', 'textarea', 'number', 'date', 'select', 'checkbox'];

async function requireProviderAccount(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');
  if (account.role !== 'admin' || !['business', 'school'].includes(account.account_type)) {
    throw forbidden('Only business or school provider accounts can manage services');
  }
  return account;
}

async function getProvider(accountId: string) {
  return db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
}

async function listOrganizationWorkers(accountId: string) {
  const rows = await db.select({
    id: schema.accounts.id,
    first_name: schema.personProfiles.first_name,
    last_name: schema.personProfiles.last_name,
    common_name: schema.personProfiles.common_name,
    member_type: schema.personProfiles.member_type,
  }).from(schema.accounts)
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.owner_account_id, schema.accounts.id))
    .where(and(
      eq(schema.accounts.parent_account_id, accountId),
      eq(schema.accounts.role, 'user'),
      eq(schema.accounts.status, 'active'),
      eq(schema.personProfiles.member_type, 'employee'),
      sql`${schema.accounts.deleted_at} is null`,
    ));
  const workerIds = rows.map((worker) => worker.id);
  const ratings = workerIds.length ? await db.select({
    worker_account_id: schema.serviceWorkerReviews.worker_account_id,
    rating: sql<number>`round(avg(${schema.serviceWorkerReviews.rating})::numeric, 1)::float`,
    review_count: sql<number>`count(*)::int`,
  }).from(schema.serviceWorkerReviews)
    .where(and(inArray(schema.serviceWorkerReviews.worker_account_id, workerIds), notInArray(schema.serviceWorkerReviews.moderation_status, ['disputed', 'removed'])))
    .groupBy(schema.serviceWorkerReviews.worker_account_id) : [];
  const ratingMap = new Map(ratings.map(({ worker_account_id, ...aggregate }) => [worker_account_id, aggregate]));
  return rows.map((worker) => ({
    id: worker.id,
    display_name: worker.common_name?.trim() || `${worker.first_name} ${worker.last_name}`.trim(),
    member_type: worker.member_type,
    ...(ratingMap.get(worker.id) ?? { rating: null, review_count: 0 }),
  }));
}

async function attachAssignments(requestRows: any[], includeHistory = false) {
  if (!requestRows.length) return requestRows;
  const requestIds = requestRows.map((row) => row.id);
  const assignments = await db.select({ assignment: schema.serviceAssignments, worker: schema.accounts, profile: schema.personProfiles })
    .from(schema.serviceAssignments)
    .innerJoin(schema.accounts, eq(schema.serviceAssignments.worker_account_id, schema.accounts.id))
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.owner_account_id, schema.accounts.id))
    .where(inArray(schema.serviceAssignments.request_id, requestIds));
  const byRequest = new Map<string, any[]>();
  for (const row of assignments) {
    if (!includeHistory && row.assignment.status !== 'active') continue;
    const list = byRequest.get(row.assignment.request_id) ?? [];
    list.push({
      id: row.assignment.id,
      ...(includeHistory ? { worker_account_id: row.worker.id } : {}),
      display_name: row.profile.common_name?.trim() || `${row.profile.first_name} ${row.profile.last_name}`.trim(),
      member_type: row.profile.member_type,
      status: row.assignment.status,
      assigned_at: row.assignment.assigned_at,
      released_at: row.assignment.released_at,
    });
    byRequest.set(row.assignment.request_id, list);
  }
  return requestRows.map((row) => ({ ...row, assignments: byRequest.get(row.id) ?? [] }));
}

async function attachWorkerReviews(requestRows: any[]) {
  if (!requestRows.length) return requestRows;
  const reviews = await db.select({
    id: schema.serviceWorkerReviews.id,
    request_id: schema.serviceWorkerReviews.request_id,
    assignment_id: schema.serviceWorkerReviews.assignment_id,
    rating: schema.serviceWorkerReviews.rating,
    review: schema.serviceWorkerReviews.review,
    worker_response: schema.serviceWorkerReviews.worker_response,
    worker_disputed_at: schema.serviceWorkerReviews.worker_disputed_at,
    moderation_status: schema.serviceWorkerReviews.moderation_status,
    created_at: schema.serviceWorkerReviews.created_at,
  }).from(schema.serviceWorkerReviews)
    .where(inArray(schema.serviceWorkerReviews.request_id, requestRows.map((row) => row.id)));
  const byAssignment = new Map(reviews.map(({ request_id: _requestId, assignment_id, ...review }) => [assignment_id, review]));
  return requestRows.map((row) => ({
    ...row,
    assignments: (row.assignments ?? []).map((assignment: any) => {
      const review = byAssignment.get(assignment.id) as any;
      return {
        ...assignment,
        review: review?.moderation_status === 'removed' ? { id: review.id, moderation_status: review.moderation_status } : review ?? null,
      };
    }),
  }));
}

function cleanFormFields(input: unknown): FormField[] {
  if (!Array.isArray(input) || input.length > 30) throw badRequest('Provide up to 30 service form fields');
  const keys = new Set<string>();
  return input.map((raw: any) => {
    const key = String(raw?.key ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 60);
    const label = String(raw?.label ?? '').trim().slice(0, 120);
    const type = String(raw?.type ?? 'text');
    if (!key || !label || !fieldTypes.includes(type)) throw badRequest('Each form field needs a label and supported type');
    if (keys.has(key)) throw badRequest(`Duplicate field key: ${key}`);
    keys.add(key);
    const options = Array.isArray(raw.options)
      ? raw.options.map((option: unknown) => String(option).trim().slice(0, 100)).filter(Boolean).slice(0, 30)
      : [];
    if (type === 'select' && options.length === 0) throw badRequest(`Add at least one choice for ${label}`);
    return { key, label, type, required: raw.required === true, ...(type === 'select' ? { options } : {}) } as FormField;
  });
}

function validateAnswers(fields: FormField[], rawAnswers: unknown) {
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) throw badRequest('Form answers are required');
  const input = rawAnswers as Record<string, unknown>;
  const answers: Record<string, unknown> = {};
  for (const field of fields) {
    let value = input[field.key];
    if (typeof value === 'string') value = value.trim();
    const empty = value === undefined || value === null || value === '';
    if (field.required && empty) throw badRequest(`${field.label} is required`);
    if (empty) continue;
    if (field.type === 'checkbox') {
      if (typeof value !== 'boolean') throw badRequest(`${field.label} must be checked or unchecked`);
    } else if (field.type === 'number') {
      if (value === '' || !Number.isFinite(Number(value))) throw badRequest(`${field.label} must be a number`);
      value = Number(value);
    } else if (field.type === 'select' && !field.options?.includes(String(value))) {
      throw badRequest(`Choose a valid ${field.label}`);
    } else if (typeof value !== 'string' || value.length > 5000) {
      throw badRequest(`${field.label} has an invalid value`);
    }
    answers[field.key] = value;
  }
  return answers;
}

export async function listServices(category?: string, search?: string) {
  if (category && !categories.includes(category as Category)) throw badRequest('Unknown service category');
  const rows = await db
    .select({ service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.providerServices)
    .innerJoin(schema.serviceProviders, eq(schema.providerServices.provider_id, schema.serviceProviders.id))
    .where(and(
      eq(schema.providerServices.is_active, true),
      eq(schema.serviceProviders.accepting_requests, true),
      category ? eq(schema.serviceProviders.category, category as Category) : undefined,
    ))
    .orderBy(desc(schema.providerServices.created_at))
    .limit(100);
  const term = search?.trim().toLowerCase();
  const providerIds = Array.from(new Set(rows.map(({ provider }) => provider.id)));
  const ratings = providerIds.length ? await db.select({
    provider_id: schema.serviceReviews.provider_id,
    rating: sql<number>`round(avg(${schema.serviceReviews.rating})::numeric, 1)::float`,
    review_count: sql<number>`count(*)::int`,
  }).from(schema.serviceReviews)
    .where(and(inArray(schema.serviceReviews.provider_id, providerIds), notInArray(schema.serviceReviews.moderation_status, ['disputed', 'removed'])))
    .groupBy(schema.serviceReviews.provider_id)
    .having(sql`count(*) >= 3`) : [];
  const ratingMap = new Map(ratings.map((r) => [r.provider_id, { rating: r.rating, review_count: r.review_count }]));
  return rows
    .filter(({ service, provider }) => !term || `${service.title} ${service.description ?? ''} ${provider.display_name} ${provider.region ?? ''} ${provider.district ?? ''}`.toLowerCase().includes(term))
    .map(({ service, provider }) => ({
      ...service,
      provider: {
        id: provider.id,
        category: provider.category,
        display_name: provider.display_name,
        description: provider.description,
        region: provider.region,
        district: provider.district,
        ward: provider.ward,
        ...ratingMap.get(provider.id),
      },
    }));
}

export async function getService(serviceId: string) {
  const rows = await db
    .select({ service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.providerServices)
    .innerJoin(schema.serviceProviders, eq(schema.providerServices.provider_id, schema.serviceProviders.id))
    .where(and(eq(schema.providerServices.id, serviceId), eq(schema.providerServices.is_active, true)))
    .limit(1);
  const row = rows[0];
  if (!row || !row.provider.accepting_requests) throw notFound('Service not found');
  const ratingRows = await db.select({
    rating: sql<number>`round(avg(${schema.serviceReviews.rating})::numeric, 1)::float`,
    review_count: sql<number>`count(*)::int`,
  }).from(schema.serviceReviews).where(and(eq(schema.serviceReviews.provider_id, row.provider.id), notInArray(schema.serviceReviews.moderation_status, ['disputed', 'removed']))).having(sql`count(*) >= 3`);
  return {
    ...row.service,
    provider: {
      id: row.provider.id,
      category: row.provider.category,
      display_name: row.provider.display_name,
      description: row.provider.description,
      region: row.provider.region,
      district: row.provider.district,
      ward: row.provider.ward,
      ...(ratingRows[0]?.review_count ? ratingRows[0] : {}),
    },
  };
}

export async function getMyProvider(accountId: string) {
  await requireProviderAccount(accountId);
  const provider = await getProvider(accountId);
  if (!provider) return null;
  const services = await db.query.providerServices.findMany({
    where: (t, { eq }) => eq(t.provider_id, provider.id),
    orderBy: (t, { desc }) => [desc(t.created_at)],
  });
  const members = await listOrganizationWorkers(accountId);
  return { ...provider, services, members };
}

export async function saveProvider(accountId: string, dto: any) {
  const account = await requireProviderAccount(accountId);
  const category = String(dto.category ?? '') as Category;
  if (!categories.includes(category)) throw badRequest('Choose hospital, school, or garage');
  if (account.account_type === 'school' && category !== 'school') throw badRequest('School accounts can only offer school services');
  if (account.account_type === 'business' && category === 'school') throw badRequest('Use a school account for school services');
  const display_name = String(dto.display_name ?? '').trim().slice(0, 200);
  if (!display_name) throw badRequest('Provider name is required');
  const existing = await getProvider(accountId);
  const values = {
    category,
    display_name,
    description: String(dto.description ?? '').trim().slice(0, 3000) || null,
    contact_number: String(dto.contact_number ?? account.mobile_number).trim().slice(0, 20) || null,
    region: String(dto.region ?? '').trim().slice(0, 100) || null,
    district: String(dto.district ?? '').trim().slice(0, 100) || null,
    ward: String(dto.ward ?? '').trim().slice(0, 100) || null,
    accepting_requests: dto.accepting_requests !== false,
    updated_at: new Date(),
  };
  if (existing) {
    const [updated] = await db.update(schema.serviceProviders).set(values).where(eq(schema.serviceProviders.id, existing.id)).returning();
    return updated;
  }
  const [created] = await db.insert(schema.serviceProviders).values({ account_id: accountId, ...values }).returning();
  return created;
}

export async function createService(accountId: string, dto: any) {
  await requireProviderAccount(accountId);
  const provider = await getProvider(accountId);
  if (!provider) throw badRequest('Set up your provider profile first');
  const title = String(dto.title ?? '').trim().slice(0, 200);
  if (!title) throw badRequest('Service name is required');
  const deliveryMode = ['appointment', 'on_demand', 'delivery', 'enrollment'].includes(dto.delivery_mode) ? dto.delivery_mode : null;
  if (!deliveryMode) throw badRequest('Choose a service delivery type');
  const priceType = ['fixed', 'quote_required', 'free'].includes(dto.price_type) ? dto.price_type : 'quote_required';
  const amount = dto.price_amount === '' || dto.price_amount === undefined || dto.price_amount === null ? null : Number(dto.price_amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw badRequest('Price must be zero or greater');
  if (priceType === 'fixed' && amount === null) throw badRequest('Enter a price for fixed-price services');
  const [created] = await db.insert(schema.providerServices).values({
    provider_id: provider.id,
    title,
    description: String(dto.description ?? '').trim().slice(0, 3000) || null,
    delivery_mode: deliveryMode,
    price_type: priceType as typeof schema.servicePriceTypeEnum.enumValues[number],
    price_amount: priceType === 'fixed' && amount !== null ? String(amount) : null,
    estimated_minutes: dto.estimated_minutes ? Math.max(1, Math.round(Number(dto.estimated_minutes))) : null,
    form_fields: cleanFormFields(dto.form_fields ?? []),
    is_active: dto.is_active !== false,
  }).returning();
  return created;
}

export async function updateService(accountId: string, serviceId: string, dto: any) {
  await requireProviderAccount(accountId);
  const provider = await getProvider(accountId);
  const service = await db.query.providerServices.findFirst({ where: (t, { eq }) => eq(t.id, serviceId) });
  if (!provider || !service || service.provider_id !== provider.id) throw notFound('Service not found');
  const updates: Record<string, unknown> = { updated_at: new Date() };
  if (dto.title !== undefined) updates.title = String(dto.title).trim().slice(0, 200) || service.title;
  if (dto.description !== undefined) updates.description = String(dto.description).trim().slice(0, 3000) || null;
  if (dto.is_active !== undefined) updates.is_active = dto.is_active === true;
  if (dto.form_fields !== undefined) updates.form_fields = cleanFormFields(dto.form_fields);
  if (dto.delivery_mode !== undefined) {
    if (!['appointment', 'on_demand', 'delivery', 'enrollment'].includes(dto.delivery_mode)) throw badRequest('Invalid delivery type');
    updates.delivery_mode = dto.delivery_mode;
  }
  if (dto.price_type !== undefined) {
    if (!['fixed', 'quote_required', 'free'].includes(dto.price_type)) throw badRequest('Invalid price type');
    updates.price_type = dto.price_type;
  }
  if (dto.price_amount !== undefined) {
    const amount = dto.price_amount === '' || dto.price_amount === null ? null : Number(dto.price_amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw badRequest('Price must be zero or greater');
    if ((dto.price_type ?? service.price_type) === 'fixed' && amount === null) throw badRequest('Enter a price for fixed-price services');
    updates.price_amount = amount === null ? null : String(amount);
  }
  if (dto.price_type === 'fixed' && dto.price_amount === undefined && service.price_amount === null) throw badRequest('Enter a price for fixed-price services');
  const [updated] = await db.update(schema.providerServices).set(updates).where(eq(schema.providerServices.id, service.id)).returning();
  return updated;
}

export async function createRequest(accountId: string, dto: any) {
  const service = await db.query.providerServices.findFirst({ where: (t, { eq }) => eq(t.id, dto.service_id) });
  if (!service || !service.is_active) throw notFound('Service not found');
  const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.id, service.provider_id) });
  if (!provider || !provider.accepting_requests) throw badRequest('This provider is not taking requests');
  const requester = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!requester) throw notFound('Client account not found');
  if (requester.id === provider.account_id) throw badRequest('You cannot request a service from your own provider account');
  let profileId: string | null = null;
  if (dto.profile_id) {
    const profile = await db.query.personProfiles.findFirst({ where: (t, { and, eq }) => and(eq(t.id, dto.profile_id), eq(t.owner_account_id, accountId)) });
    if (!profile) throw forbidden('Choose a profile belonging to your account');
    profileId = profile.id;
  }
  const sharing = dto.sharing_scope === 'matching_providers' ? 'matching_providers' : 'selected_provider';
  const answers = validateAnswers(service.form_fields, dto.answers ?? {});
  const region = String(dto.region ?? '').trim().slice(0, 100) || null;
  if (sharing === 'matching_providers' && !region) throw badRequest('Enter your region to match with nearby providers');
  const summary = String(dto.summary ?? '').trim().slice(0, 240) || service.title;
  const [created] = await db.insert(schema.serviceRequests).values({
    requester_account_id: accountId,
    requester_profile_id: profileId,
    provider_service_id: service.id,
    sharing_scope: sharing,
    status: 'open',
    summary,
    answers,
    form_snapshot: service.form_fields,
    region,
    district: String(dto.district ?? '').trim().slice(0, 100) || null,
    ward: String(dto.ward ?? '').trim().slice(0, 100) || null,
  }).returning();
  return { id: created.id, status: created.status, sharing_scope: created.sharing_scope };
}

async function attachOffers(requestRows: any[]) {
  if (!requestRows.length) return [];
  const ids = requestRows.map((r) => r.request.id);
  const offers = await db
    .select({ offer: schema.serviceOffers, provider: schema.serviceProviders, service: schema.providerServices })
    .from(schema.serviceOffers)
    .innerJoin(schema.serviceProviders, eq(schema.serviceOffers.provider_id, schema.serviceProviders.id))
    .innerJoin(schema.providerServices, eq(schema.serviceOffers.provider_service_id, schema.providerServices.id))
    .where(inArray(schema.serviceOffers.request_id, ids))
    .orderBy(desc(schema.serviceOffers.created_at));
  const byRequest = new Map<string, any[]>();
  for (const row of offers) {
    const list = byRequest.get(row.offer.request_id) ?? [];
    list.push({
      ...row.offer,
      provider: {
        id: row.provider.id,
        display_name: row.provider.display_name,
        category: row.provider.category,
        region: row.provider.region,
        district: row.provider.district,
        contact_number: row.offer.status === 'accepted' ? row.provider.contact_number : null,
      },
      service: { id: row.service.id, title: row.service.title },
    });
    byRequest.set(row.offer.request_id, list);
  }
  const reviews = await db.select({
    id: schema.serviceReviews.id,
    request_id: schema.serviceReviews.request_id,
    rating: schema.serviceReviews.rating,
    review: schema.serviceReviews.review,
    provider_response: schema.serviceReviews.provider_response,
    moderation_status: schema.serviceReviews.moderation_status,
  }).from(schema.serviceReviews).where(inArray(schema.serviceReviews.request_id, ids));
  const reviewMap = new Map(reviews.map((review) => [review.request_id, review.moderation_status === 'removed' ? { id: review.id, moderation_status: review.moderation_status } : review]));
  return requestRows.map(({ request, service, provider }) => ({
    ...request,
    service: { ...service, provider: { id: provider.id, category: provider.category, display_name: provider.display_name } },
    offers: byRequest.get(request.id) ?? [],
    review: reviewMap.get(request.id) ?? null,
  }));
}

export async function listMyRequests(accountId: string) {
  const rows = await db
    .select({ request: schema.serviceRequests, service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.serviceRequests)
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .innerJoin(schema.serviceProviders, eq(schema.providerServices.provider_id, schema.serviceProviders.id))
    .where(eq(schema.serviceRequests.requester_account_id, accountId))
    .orderBy(desc(schema.serviceRequests.created_at));
  return attachWorkerReviews(await attachAssignments(await attachOffers(rows), true));
}

export async function listProviderRequests(accountId: string) {
  await requireProviderAccount(accountId);
  const provider = await getProvider(accountId);
  if (!provider) return [];
  const services = await db.query.providerServices.findMany({ where: (t, { eq }) => eq(t.provider_id, provider.id) });
  const serviceIds = services.map((s) => s.id);
  const rows = await db
    .select({ request: schema.serviceRequests, service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.serviceRequests)
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .innerJoin(schema.serviceProviders, eq(schema.providerServices.provider_id, schema.serviceProviders.id))
    .where(and(
      or(
        serviceIds.length ? inArray(schema.serviceRequests.provider_service_id, serviceIds) : undefined,
        eq(schema.serviceRequests.sharing_scope, 'matching_providers'),
      ),
      or(eq(schema.serviceRequests.status, 'open'), eq(schema.serviceRequests.status, 'offered'), eq(schema.serviceRequests.status, 'accepted'), eq(schema.serviceRequests.status, 'in_progress'), eq(schema.serviceRequests.status, 'completed')),
    ))
    .orderBy(desc(schema.serviceRequests.created_at));
  const acceptedOffers = await db.query.serviceOffers.findMany({
    where: (t, { and, eq, inArray }) => and(inArray(t.request_id, rows.map((row) => row.request.id)), eq(t.status, 'accepted')),
  });
  const acceptedProviderByRequest = new Map(acceptedOffers.map((offer) => [offer.request_id, offer.provider_id]));
  const visible = rows.filter(({ request, provider: sourceProvider }) => {
    if (['accepted', 'in_progress', 'completed'].includes(request.status)) {
      return acceptedProviderByRequest.get(request.id) === provider.id;
    }
    return sourceProvider.id === provider.id || (
      request.sharing_scope === 'matching_providers' &&
      sourceProvider.category === provider.category &&
      Boolean(provider.region && request.region && provider.region.toLowerCase() === request.region.toLowerCase()) &&
      (!request.district || !provider.district || provider.district.toLowerCase() === request.district.toLowerCase())
    );
  });
  const withOffers = await attachOffers(visible);
  const withAssignments = await attachWorkerReviews(await attachAssignments(withOffers, true));
  return withAssignments.map((request) => {
    const { requester_account_id: _requesterAccountId, requester_profile_id: _requesterProfileId, ...safeRequest } = request;
    return {
    ...safeRequest,
    // Providers can see their own prior reply; client offers stay private until
    // the client has chosen one, avoiding a competing-provider price leak.
    offers: request.offers.filter((offer: any) => offer.provider_id === provider.id),
  }; });
}

export async function updateServiceAssignment(accountId: string, requestId: string, dto: any) {
  await requireProviderAccount(accountId);
  const provider = await getProvider(accountId);
  const request = await db.query.serviceRequests.findFirst({ where: (t, { eq }) => eq(t.id, requestId) });
  if (!provider || !request) throw notFound('Service request not found');
  if (!['accepted', 'in_progress'].includes(request.status)) throw badRequest('Assign workers after the client accepts your offer');
  const acceptedOffer = await db.query.serviceOffers.findFirst({ where: (t, { and, eq }) => and(
    eq(t.request_id, request.id), eq(t.provider_id, provider.id), eq(t.status, 'accepted'),
  ) });
  if (!acceptedOffer) throw forbidden('Only the provider chosen by the client can assign workers');

  if (dto.action === 'release') {
    const assignment = await db.query.serviceAssignments.findFirst({ where: (t, { and, eq }) => and(
      eq(t.id, dto.assignment_id), eq(t.request_id, request.id), eq(t.provider_id, provider.id), eq(t.status, 'active'),
    ) });
    if (!assignment) throw notFound('Active worker assignment not found');
    const activeAssignments = await db.query.serviceAssignments.findMany({ where: (t, { and, eq }) => and(
      eq(t.request_id, request.id), eq(t.status, 'active'),
    ) });
    if (request.status === 'in_progress' && activeAssignments.length <= 1) {
      throw badRequest('Assign a replacement worker before releasing the only worker on an active service');
    }
    await db.transaction(async (tx) => {
      await tx.update(schema.serviceAssignments).set({ status: 'released', released_at: new Date(), updated_at: new Date() }).where(eq(schema.serviceAssignments.id, assignment.id));
      await tx.insert(schema.serviceAssignmentEvents).values({ assignment_id: assignment.id, actor_account_id: accountId, event_type: 'released', note: String(dto.note ?? '').trim().slice(0, 1000) || null });
    });
    return { id: assignment.id, status: 'released' };
  }

  const workerAccountId = String(dto.worker_account_id ?? '');
  const worker = (await listOrganizationWorkers(accountId)).find((member) => member.id === workerAccountId);
  if (!worker) throw badRequest('Choose an active employee account managed by this organization');
  const existing = await db.query.serviceAssignments.findFirst({ where: (t, { and, eq }) => and(
    eq(t.request_id, request.id), eq(t.worker_account_id, workerAccountId),
  ) });
  if (existing?.status === 'active') throw conflict('This employee is already assigned to the service');
  if (existing) {
    const [reactivated] = await db.transaction(async (tx) => {
      const [updated] = await tx.update(schema.serviceAssignments).set({ status: 'active', released_at: null, updated_at: new Date() }).where(eq(schema.serviceAssignments.id, existing.id)).returning();
      await tx.insert(schema.serviceAssignmentEvents).values({ assignment_id: existing.id, actor_account_id: accountId, event_type: 'assigned', note: 'Reassigned to service' });
      return [updated];
    });
    return { ...reactivated, worker };
  }
  const [assignment] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(schema.serviceAssignments).values({
      request_id: request.id,
      provider_id: provider.id,
      worker_account_id: workerAccountId,
      assigned_by_account_id: accountId,
    }).returning();
    await tx.insert(schema.serviceAssignmentEvents).values({ assignment_id: created.id, actor_account_id: accountId, event_type: 'assigned' });
    return [created];
  });
  return { ...assignment, worker };
}

export async function listMyServiceAssignments(accountId: string) {
  const profile = await db.query.personProfiles.findFirst({ where: (t, { eq }) => eq(t.owner_account_id, accountId) });
  if (!profile || profile.member_type !== 'employee') return [];
  const rows = await db.select({ assignment: schema.serviceAssignments, request: schema.serviceRequests, service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.serviceAssignments)
    .innerJoin(schema.serviceRequests, eq(schema.serviceAssignments.request_id, schema.serviceRequests.id))
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .innerJoin(schema.serviceProviders, eq(schema.serviceAssignments.provider_id, schema.serviceProviders.id))
    .where(and(
      eq(schema.serviceAssignments.worker_account_id, accountId),
      eq(schema.serviceAssignments.status, 'active'),
      inArray(schema.serviceRequests.status, ['accepted', 'in_progress', 'completed']),
    ))
    .orderBy(desc(schema.serviceAssignments.assigned_at));
  const assignments = rows.map(({ assignment, request, service, provider }) => ({
    id: assignment.id,
    assigned_at: assignment.assigned_at,
    status: request.status,
    summary: request.summary,
    answers: request.answers,
    form_snapshot: request.form_snapshot,
    region: request.region,
    district: request.district,
    ward: request.ward,
    service: { title: service.title },
    provider: { display_name: provider.display_name, category: provider.category },
  }));
  const reviews = assignments.length ? await db.select({
    id: schema.serviceWorkerReviews.id,
    assignment_id: schema.serviceWorkerReviews.assignment_id,
    rating: schema.serviceWorkerReviews.rating,
    review: schema.serviceWorkerReviews.review,
    worker_response: schema.serviceWorkerReviews.worker_response,
    worker_disputed_at: schema.serviceWorkerReviews.worker_disputed_at,
    moderation_status: schema.serviceWorkerReviews.moderation_status,
  }).from(schema.serviceWorkerReviews).where(inArray(schema.serviceWorkerReviews.assignment_id, assignments.map((a) => a.id))) : [];
  const reviewByAssignment = new Map(reviews.map(({ assignment_id, ...review }) => [assignment_id, review]));
  return assignments.map((assignment) => {
    const review = reviewByAssignment.get(assignment.id) as any;
    return { ...assignment, review: review?.moderation_status === 'removed' ? { id: review.id, moderation_status: review.moderation_status } : review ?? null };
  });
}

export async function submitOffer(accountId: string, requestId: string, dto: any) {
  await requireProviderAccount(accountId);
  const provider = await getProvider(accountId);
  if (!provider) throw badRequest('Set up your provider profile first');
  const request = await db.query.serviceRequests.findFirst({ where: (t, { eq }) => eq(t.id, requestId) });
  if (!request || !['open', 'offered'].includes(request.status)) throw notFound('Open service request not found');
  if (request.requester_account_id === accountId) throw forbidden('You cannot respond to your own request');
  const sourceService = await db.query.providerServices.findFirst({ where: (t, { eq }) => eq(t.id, request.provider_service_id) });
  const sourceProvider = sourceService ? await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.id, sourceService.provider_id) }) : null;
  const nearby = request.sharing_scope === 'matching_providers' && sourceProvider?.category === provider.category &&
    Boolean(provider.region && request.region && provider.region.toLowerCase() === request.region.toLowerCase()) &&
    (!request.district || !provider.district || provider.district.toLowerCase() === request.district.toLowerCase());
  const visible = sourceService && (sourceService.provider_id === provider.id || nearby);
  if (!visible) throw forbidden('This request was not shared with your provider');
  const service = await db.query.providerServices.findFirst({ where: (t, { and, eq }) => and(eq(t.id, dto.service_id), eq(t.provider_id, provider.id), eq(t.is_active, true)) });
  if (!service) throw badRequest('Choose one of your active services');
  const price = dto.price_amount === '' || dto.price_amount === undefined || dto.price_amount === null ? null : Number(dto.price_amount);
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw badRequest('Offer price must be zero or greater');
  const existing = await db.query.serviceOffers.findFirst({ where: (t, { and, eq }) => and(eq(t.request_id, request.id), eq(t.provider_id, provider.id)) });
  if (existing) throw conflict('Your provider has already responded to this request');
  const [offer] = await db.insert(schema.serviceOffers).values({
    request_id: request.id,
    provider_id: provider.id,
    provider_service_id: service.id,
    price_amount: price === null ? null : String(price),
    message: String(dto.message ?? '').trim().slice(0, 2000) || null,
    estimated_minutes: dto.estimated_minutes ? Math.max(1, Math.round(Number(dto.estimated_minutes))) : null,
  }).returning();
  await db.update(schema.serviceRequests).set({ status: 'offered', updated_at: new Date() }).where(eq(schema.serviceRequests.id, request.id));
  return offer;
}

export async function acceptOffer(accountId: string, offerId: string) {
  const offer = await db.query.serviceOffers.findFirst({ where: (t, { eq }) => eq(t.id, offerId) });
  if (!offer) throw notFound('Offer not found');
  const request = await db.query.serviceRequests.findFirst({ where: (t, { eq }) => eq(t.id, offer.request_id) });
  if (!request || request.requester_account_id !== accountId) throw forbidden('This is not your service request');
  if (!['open', 'offered'].includes(request.status)) throw badRequest('This request is no longer accepting offers');
  await db.transaction(async (tx) => {
    await tx.update(schema.serviceOffers).set({ status: 'declined', updated_at: new Date() }).where(eq(schema.serviceOffers.request_id, request.id));
    await tx.update(schema.serviceOffers).set({ status: 'accepted', updated_at: new Date() }).where(eq(schema.serviceOffers.id, offer.id));
    await tx.update(schema.serviceRequests).set({ status: 'accepted', updated_at: new Date() }).where(eq(schema.serviceRequests.id, request.id));
  });
  return { message: 'Provider accepted', request_id: request.id };
}

export async function createReview(accountId: string, requestId: string, dto: any) {
  const request = await db.query.serviceRequests.findFirst({ where: (t, { eq }) => eq(t.id, requestId) });
  if (!request || request.requester_account_id !== accountId) throw forbidden('This is not your service request');
  if (request.status !== 'completed') throw badRequest('You can review a service after it is completed');
  const accepted = await db.query.serviceOffers.findFirst({ where: (t, { and, eq }) => and(eq(t.request_id, request.id), eq(t.status, 'accepted')) });
  if (!accepted) throw badRequest('No provider offer was accepted for this request');
  const rating = Number(dto.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Choose a rating from 1 to 5');
  const existing = await db.query.serviceReviews.findFirst({ where: (t, { eq }) => eq(t.request_id, request.id) });
  if (existing) throw conflict('You have already reviewed this service');
  const [review] = await db.insert(schema.serviceReviews).values({
    request_id: request.id,
    provider_id: accepted.provider_id,
    reviewer_account_id: accountId,
    rating,
    review: String(dto.review ?? '').trim().slice(0, 2000) || null,
  }).returning();
  return review;
}

export async function createWorkerReview(accountId: string, requestId: string, dto: any) {
  const request = await db.query.serviceRequests.findFirst({ where: (t, { eq }) => eq(t.id, requestId) });
  if (!request || request.requester_account_id !== accountId) throw forbidden('This is not your service request');
  if (request.status !== 'completed') throw badRequest('You can review employees after the service is completed');
  const assignment = await db.query.serviceAssignments.findFirst({ where: (t, { and, eq }) => and(
    eq(t.id, String(dto.assignment_id ?? '')), eq(t.request_id, request.id),
  ) });
  if (!assignment) throw badRequest('Choose an employee assigned to this service');
  const profile = await db.query.personProfiles.findFirst({ where: (t, { and, eq }) => and(
    eq(t.owner_account_id, assignment.worker_account_id), eq(t.member_type, 'employee'),
  ) });
  if (!profile) throw badRequest('Only assigned employee accounts can receive a worker review');
  const accepted = await db.query.serviceOffers.findFirst({ where: (t, { and, eq }) => and(
    eq(t.request_id, request.id), eq(t.provider_id, assignment.provider_id), eq(t.status, 'accepted'),
  ) });
  if (!accepted) throw badRequest('The assigned organization was not selected for this service');
  const rating = Number(dto.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Choose a rating from 1 to 5');
  const existing = await db.query.serviceWorkerReviews.findFirst({ where: (t, { and, eq }) => and(
    eq(t.request_id, request.id), eq(t.worker_account_id, assignment.worker_account_id),
  ) });
  if (existing) throw conflict('You have already reviewed this employee for the service');
  const [review] = await db.insert(schema.serviceWorkerReviews).values({
    request_id: request.id,
    assignment_id: assignment.id,
    provider_id: assignment.provider_id,
    worker_account_id: assignment.worker_account_id,
    reviewer_account_id: accountId,
    rating,
    review: String(dto.review ?? '').trim().slice(0, 2000) || null,
  }).returning();
  return { id: review.id, rating: review.rating, review: review.review, created_at: review.created_at };
}

export async function respondToWorkerReview(accountId: string, reviewId: string, dto: any) {
  const existing = await db.query.serviceWorkerReviews.findFirst({ where: (t, { eq }) => eq(t.id, reviewId) });
  if (!existing || existing.worker_account_id !== accountId) throw forbidden('You can only respond to feedback about your own work');
  if (existing.moderation_status === 'removed') throw badRequest('This feedback was removed after platform review');
  const response = String(dto.response ?? '').trim().slice(0, 2000);
  if (!response) throw badRequest('Write a response before submitting');
  const [updated] = await db.update(schema.serviceWorkerReviews).set({
    worker_response: response,
    ...(dto.dispute === true && existing.moderation_status === 'active' ? { worker_disputed_at: new Date(), moderation_status: 'disputed' as const } : {}),
    updated_at: new Date(),
  }).where(eq(schema.serviceWorkerReviews.id, reviewId)).returning({ id: schema.serviceWorkerReviews.id, worker_response: schema.serviceWorkerReviews.worker_response, worker_disputed_at: schema.serviceWorkerReviews.worker_disputed_at });
  return updated;
}

export async function respondToProviderReview(accountId: string, reviewId: string, dto: any) {
  const provider = await getProvider(accountId);
  const existing = await db.query.serviceReviews.findFirst({ where: (t, { eq }) => eq(t.id, reviewId) });
  if (!provider || !existing || existing.provider_id !== provider.id) throw forbidden('You can only respond to feedback about your organization');
  if (existing.moderation_status === 'removed') throw badRequest('This feedback was removed after platform review');
  const response = String(dto.response ?? '').trim().slice(0, 2000);
  if (!response) throw badRequest('Write a response before submitting');
  const [updated] = await db.update(schema.serviceReviews).set({
    provider_response: response,
    ...(dto.dispute === true && existing.moderation_status === 'active' ? { provider_disputed_at: new Date(), moderation_status: 'disputed' as const } : {}),
    updated_at: new Date(),
  }).where(eq(schema.serviceReviews.id, reviewId)).returning({ id: schema.serviceReviews.id, provider_response: schema.serviceReviews.provider_response, provider_disputed_at: schema.serviceReviews.provider_disputed_at });
  return updated;
}

export async function listProviderReviewDisputes() {
  const rows = await db.select({ review: schema.serviceReviews, request: schema.serviceRequests, service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.serviceReviews)
    .innerJoin(schema.serviceRequests, eq(schema.serviceReviews.request_id, schema.serviceRequests.id))
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .innerJoin(schema.serviceProviders, eq(schema.serviceReviews.provider_id, schema.serviceProviders.id))
    .where(eq(schema.serviceReviews.moderation_status, 'disputed'))
    .orderBy(desc(schema.serviceReviews.provider_disputed_at))
    .limit(100);
  return rows.map(({ review, request, service, provider }) => ({
    id: review.id,
    rating: review.rating,
    review: review.review,
    provider_response: review.provider_response,
    disputed_at: review.provider_disputed_at,
    created_at: review.created_at,
    request_summary: request.summary,
    service_title: service.title,
    provider_name: provider.display_name,
  }));
}

export async function resolveProviderReviewDispute(adminAccountId: string, reviewId: string, dto: any) {
  const outcome = String(dto.outcome ?? '');
  if (!['upheld', 'removed'].includes(outcome)) throw badRequest('Choose whether to uphold or remove the review');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (!note) throw badRequest('Add a short moderation note');
  const review = await db.query.serviceReviews.findFirst({ where: (t, { eq }) => eq(t.id, reviewId) });
  if (!review || review.moderation_status !== 'disputed') throw notFound('Open organization review dispute not found');
  const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.id, review.provider_id) });
  await db.transaction(async (tx) => {
    await tx.update(schema.serviceReviews).set({
      moderation_status: outcome as 'upheld' | 'removed',
      moderation_note: note,
      moderated_by_account_id: adminAccountId,
      moderated_at: new Date(),
      updated_at: new Date(),
    }).where(eq(schema.serviceReviews.id, reviewId));
    await tx.insert(schema.systemAdminLogs).values({
      actor_account_id: adminAccountId,
      action: 'provider_review_moderated',
      target_account_id: provider?.account_id ?? null,
      payload: { review_id: reviewId, provider_id: review.provider_id, outcome, note },
    });
  });
  return { id: reviewId, moderation_status: outcome };
}

export async function listWorkerReviewDisputes() {
  const rows = await db.select({ review: schema.serviceWorkerReviews, request: schema.serviceRequests, service: schema.providerServices, provider: schema.serviceProviders, worker: schema.personProfiles })
    .from(schema.serviceWorkerReviews)
    .innerJoin(schema.serviceRequests, eq(schema.serviceWorkerReviews.request_id, schema.serviceRequests.id))
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .innerJoin(schema.serviceProviders, eq(schema.serviceWorkerReviews.provider_id, schema.serviceProviders.id))
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.owner_account_id, schema.serviceWorkerReviews.worker_account_id))
    .where(eq(schema.serviceWorkerReviews.moderation_status, 'disputed'))
    .orderBy(desc(schema.serviceWorkerReviews.worker_disputed_at))
    .limit(100);
  return rows.map(({ review, request, service, provider, worker }) => ({
    id: review.id,
    rating: review.rating,
    review: review.review,
    worker_response: review.worker_response,
    worker_disputed_at: review.worker_disputed_at,
    created_at: review.created_at,
    request_summary: request.summary,
    service_title: service.title,
    provider_name: provider.display_name,
    worker_name: worker.common_name?.trim() || `${worker.first_name} ${worker.last_name}`.trim(),
  }));
}

export async function resolveWorkerReviewDispute(adminAccountId: string, reviewId: string, dto: any) {
  const outcome = String(dto.outcome ?? '');
  if (!['upheld', 'removed'].includes(outcome)) throw badRequest('Choose whether to uphold or remove the review');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (!note) throw badRequest('Add a short moderation note');
  const review = await db.query.serviceWorkerReviews.findFirst({ where: (t, { eq }) => eq(t.id, reviewId) });
  if (!review || review.moderation_status !== 'disputed') throw notFound('Open employee review dispute not found');
  await db.transaction(async (tx) => {
    await tx.update(schema.serviceWorkerReviews).set({
      moderation_status: outcome as 'upheld' | 'removed',
      moderation_note: note,
      moderated_by_account_id: adminAccountId,
      moderated_at: new Date(),
      updated_at: new Date(),
    }).where(eq(schema.serviceWorkerReviews.id, reviewId));
    await tx.insert(schema.systemAdminLogs).values({
      actor_account_id: adminAccountId,
      action: 'worker_review_moderated',
      target_account_id: review.worker_account_id,
      payload: { review_id: reviewId, outcome, note },
    });
  });
  return { id: reviewId, moderation_status: outcome };
}

export async function updateRequestStatus(accountId: string, requestId: string, dto: any) {
  const request = await db.query.serviceRequests.findFirst({ where: (t, { eq }) => eq(t.id, requestId) });
  if (!request) throw notFound('Request not found');
  if (dto.status === 'cancelled' && request.requester_account_id === accountId && ['open', 'offered'].includes(request.status)) {
    await db.update(schema.serviceRequests).set({ status: 'cancelled', updated_at: new Date() }).where(eq(schema.serviceRequests.id, request.id));
    return { status: 'cancelled' };
  }
  const provider = await getProvider(accountId);
  if (!provider || !['in_progress', 'completed'].includes(dto.status)) throw forbidden('Only the accepted provider can update this request');
  const accepted = await db.query.serviceOffers.findFirst({ where: (t, { and, eq }) => and(eq(t.request_id, request.id), eq(t.provider_id, provider.id), eq(t.status, 'accepted')) });
  if (!accepted || (dto.status === 'in_progress' && request.status !== 'accepted') || (dto.status === 'completed' && request.status !== 'in_progress')) {
    throw forbidden('Only the accepted provider can advance this request');
  }
  if (dto.status === 'in_progress') {
    const assignedWorkers = await db.query.serviceAssignments.findMany({ where: (t, { and, eq }) => and(eq(t.request_id, request.id), eq(t.status, 'active')) });
    if (!assignedWorkers.length) throw badRequest('Assign at least one employee before starting this service');
  }
  await db.update(schema.serviceRequests).set({ status: dto.status, updated_at: new Date() }).where(eq(schema.serviceRequests.id, request.id));
  return { status: dto.status };
}
