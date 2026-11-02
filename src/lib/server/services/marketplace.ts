import { and, desc, eq, gt, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, conflict, forbidden, notFound } from '../errors';
import { notifyAccount } from './notifications';

type Category = typeof schema.serviceCategoryEnum.enumValues[number];
type FormField = schema.ServiceFormField;

const categories: Category[] = ['hospital', 'school', 'garage'];
const fieldTypes = ['text', 'textarea', 'number', 'date', 'select', 'checkbox'];

async function requireProviderAccount(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');
  if (account.role !== 'admin' || !['business', 'school', 'institution'].includes(account.account_type)) {
    throw forbidden('Only business or school provider accounts can manage services');
  }
  return account;
}

async function getProvider(accountId: string) {
  return db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
}

async function listOrganizationWorkers(accountId: string, schoolRoster = false) {
  const linked = await db.select({ worker_account_id: schema.organizationMemberships.worker_account_id })
    .from(schema.organizationMemberships)
    .where(and(eq(schema.organizationMemberships.organization_account_id, accountId), eq(schema.organizationMemberships.status, 'active')));
  const memberIds = [...new Set(linked.map((row) => row.worker_account_id))];
  const rows = await db.select({
    id: schema.accounts.id,
    first_name: schema.personProfiles.first_name,
    last_name: schema.personProfiles.last_name,
    common_name: schema.personProfiles.common_name,
    member_type: schema.personProfiles.member_type,
    birthdate: schema.personProfiles.birthdate,
  }).from(schema.accounts)
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.owner_account_id, schema.accounts.id))
    .where(and(inArray(schema.accounts.role, ['user', 'individual']), eq(schema.accounts.status, 'active'), inArray(schema.personProfiles.member_type, schoolRoster ? ['employee', 'student', 'underage'] : ['employee']), sql`${schema.accounts.deleted_at} is null`, memberIds.length ? inArray(schema.accounts.id, memberIds) : sql`false`));
  const adultWorkers = rows.filter((worker) => worker.member_type === 'employee' && Date.now() - new Date(worker.birthdate).getTime() >= 18 * 365.2425 * 24 * 60 * 60 * 1000);
  const workerIds = adultWorkers.map((worker) => worker.id);
  const adultWorkerIds = new Set(workerIds);
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
    ratings_available: adultWorkerIds.has(worker.id),
    ...(adultWorkerIds.has(worker.id) ? (ratingMap.get(worker.id) ?? { rating: null, review_count: 0 }) : { rating: null, review_count: 0 }),
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
      ratings_available: row.profile.member_type === 'employee' && Date.now() - new Date(row.profile.birthdate).getTime() >= 18 * 365.2425 * 24 * 60 * 60 * 1000,
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
    rating_dimensions: schema.serviceWorkerReviews.rating_dimensions,
    review: schema.serviceWorkerReviews.review,
    edit_deadline: schema.serviceWorkerReviews.edit_deadline,
    edited_at: schema.serviceWorkerReviews.edited_at,
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
        review: assignment.ratings_available === false ? null : review?.moderation_status === 'removed' ? { id: review.id, moderation_status: review.moderation_status } : review ?? null,
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
        verification_status: provider.verification_status,
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
      verification_status: row.provider.verification_status,
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
  const members = await listOrganizationWorkers(accountId, provider.category === 'school');
  return { ...provider, services, members };
}

export async function getProviderOperationalMetrics(accountId: string) {
  await requireProviderAccount(accountId);
  const provider = await getProvider(accountId);
  if (!provider) throw notFound('Provider profile not found');
  const requests = await db.select({ id: schema.serviceRequests.id, status: schema.serviceRequests.status, created_at: schema.serviceRequests.created_at })
    .from(schema.serviceRequests).innerJoin(schema.providerServices, eq(schema.providerServices.id, schema.serviceRequests.provider_service_id))
    .where(eq(schema.providerServices.provider_id, provider.id));
  const responses = await db.select({ request_created_at: schema.serviceRequests.created_at, response_created_at: schema.serviceOffers.created_at })
    .from(schema.serviceOffers).innerJoin(schema.serviceRequests, eq(schema.serviceOffers.request_id, schema.serviceRequests.id))
    .where(eq(schema.serviceOffers.provider_id, provider.id));
  const reviewStats = await db.select({ rating: sql<number>`round(avg(${schema.serviceReviews.rating})::numeric, 1)::float`, count: sql<number>`count(*)::int` })
    .from(schema.serviceReviews).where(and(eq(schema.serviceReviews.provider_id, provider.id), notInArray(schema.serviceReviews.moderation_status, ['disputed', 'removed'])));
  const [openComplaints] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.serviceComplaintCases)
    .innerJoin(schema.serviceRequests, eq(schema.serviceComplaintCases.request_id, schema.serviceRequests.id))
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .where(and(eq(schema.providerServices.provider_id, provider.id), inArray(schema.serviceComplaintCases.status, ['open', 'in_review'])));
  const averageResponseMinutes = responses.length ? Math.round(responses.reduce((sum, row) => sum + Math.max(0, row.response_created_at.getTime() - row.request_created_at.getTime()) / 60_000, 0) / responses.length) : null;
  return {
    total_requests: requests.length,
    active_requests: requests.filter((request) => ['accepted', 'in_progress'].includes(request.status)).length,
    completed_requests: requests.filter((request) => request.status === 'completed').length,
    cancelled_requests: requests.filter((request) => request.status === 'cancelled').length,
    response_rate: requests.length ? Math.round(responses.length / requests.length * 100) : null,
    average_first_response_minutes: averageResponseMinutes,
    average_rating: reviewStats[0]?.rating ?? null,
    review_count: reviewStats[0]?.count ?? 0,
    open_complaints: openComplaints.count,
  };
}

export async function saveProvider(accountId: string, dto: any) {
  const account = await requireProviderAccount(accountId);
  const category = String(dto.category ?? '') as Category;
  if (!categories.includes(category)) throw badRequest('Choose hospital, school, or garage');
  if (account.account_type === 'school' && category !== 'school') throw badRequest('School accounts can only offer school services');
  if (['business', 'institution'].includes(account.account_type) && category === 'school') throw badRequest('Use a school account for school services');
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
    rating_dimensions: schema.serviceReviews.rating_dimensions,
    review: schema.serviceReviews.review,
    edit_deadline: schema.serviceReviews.edit_deadline,
    edited_at: schema.serviceReviews.edited_at,
    provider_response: schema.serviceReviews.provider_response,
    provider_disputed_at: schema.serviceReviews.provider_disputed_at,
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
  const worker = (await listOrganizationWorkers(accountId, provider.category === 'school')).find((member) => member.id === workerAccountId);
  if (!worker) throw badRequest('Choose an active employee account managed by this organization');
  const workerProfile = await db.query.personProfiles.findFirst({ where: (t, { and, eq, isNull, inArray }) => and(eq(t.owner_account_id, workerAccountId), inArray(t.member_type, provider.category === 'school' ? ['employee', 'student', 'underage'] : ['employee']), isNull(t.deleted_at)) });
  if (!workerProfile) throw badRequest('This account has no active employee profile');
  const isMinor = Date.now() - new Date(workerProfile.birthdate).getTime() < 18 * 365.2425 * 24 * 60 * 60 * 1000;
  if (isMinor) {
    const service = await db.query.providerServices.findFirst({ where: (t, { eq }) => eq(t.id, request.provider_service_id) });
    const consent = await db.query.serviceGuardianConsents.findFirst({ where: (t, { and, eq, isNull }) => and(
      eq(t.request_id, request.id), eq(t.minor_account_id, workerAccountId), eq(t.guardian_account_id, request.requester_account_id), isNull(t.revoked_at),
    ) });
    if (provider.category !== 'school' || !service || !consent) throw forbidden('A minor may only be assigned to a school service after their family guardian records consent for this request');
  }
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
  if (!profile || !['employee', 'student', 'underage'].includes(profile.member_type)) return [];
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
    rating_dimensions: schema.serviceWorkerReviews.rating_dimensions,
    review: schema.serviceWorkerReviews.review,
    edit_deadline: schema.serviceWorkerReviews.edit_deadline,
    edited_at: schema.serviceWorkerReviews.edited_at,
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
  const ratingDimensions = cleanRatingDimensions(dto.rating_dimensions);
  const existing = await db.query.serviceReviews.findFirst({ where: (t, { eq }) => eq(t.request_id, request.id) });
  if (existing) throw conflict('You have already reviewed this service');
  const [review] = await db.insert(schema.serviceReviews).values({
    request_id: request.id,
    provider_id: accepted.provider_id,
    reviewer_account_id: accountId,
    rating,
    rating_dimensions: ratingDimensions,
    review: String(dto.review ?? '').trim().slice(0, 2000) || null,
    edit_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
  if (Date.now() - new Date(profile.birthdate).getTime() < 18 * 365.2425 * 24 * 60 * 60 * 1000) throw badRequest('Worker ratings are disabled for employees under 18');
  const accepted = await db.query.serviceOffers.findFirst({ where: (t, { and, eq }) => and(
    eq(t.request_id, request.id), eq(t.provider_id, assignment.provider_id), eq(t.status, 'accepted'),
  ) });
  if (!accepted) throw badRequest('The assigned organization was not selected for this service');
  const rating = Number(dto.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Choose a rating from 1 to 5');
  const ratingDimensions = cleanRatingDimensions(dto.rating_dimensions);
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
    rating_dimensions: ratingDimensions,
    review: String(dto.review ?? '').trim().slice(0, 2000) || null,
    edit_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }).returning();
  return { id: review.id, rating: review.rating, review: review.review, created_at: review.created_at };
}

const ratingDimensionKeys = ['communication', 'punctuality', 'care', 'outcome'] as const;
function cleanRatingDimensions(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest('Rate communication, punctuality, care, and outcome');
  const result: Record<string, number> = {};
  for (const key of ratingDimensionKeys) {
    const rating = Number((value as Record<string, unknown>)[key]);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest(`Choose a ${key} rating from 1 to 5`);
    result[key] = rating;
  }
  return result;
}

export async function editServiceReview(accountId: string, reviewId: string, dto: any) {
  const rating = Number(dto.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Choose a rating from 1 to 5');
  const dimensions = cleanRatingDimensions(dto.rating_dimensions);
  const [updated] = await db.update(schema.serviceReviews).set({ rating, rating_dimensions: dimensions, review: String(dto.review ?? '').trim().slice(0, 2000) || null, edited_at: new Date(), updated_at: new Date() })
    .where(and(eq(schema.serviceReviews.id, reviewId), eq(schema.serviceReviews.reviewer_account_id, accountId), eq(schema.serviceReviews.moderation_status, 'active'), isNull(schema.serviceReviews.provider_disputed_at), sql`${schema.serviceReviews.provider_response} is null`, gt(schema.serviceReviews.edit_deadline, new Date()))).returning();
  if (!updated) throw badRequest('This review can no longer be edited. The 7-day edit window may have ended or the provider has responded or disputed it.');
  return updated;
}

export async function editWorkerReview(accountId: string, reviewId: string, dto: any) {
  const rating = Number(dto.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Choose a rating from 1 to 5');
  const dimensions = cleanRatingDimensions(dto.rating_dimensions);
  const [updated] = await db.update(schema.serviceWorkerReviews).set({ rating, rating_dimensions: dimensions, review: String(dto.review ?? '').trim().slice(0, 2000) || null, edited_at: new Date(), updated_at: new Date() })
    .where(and(eq(schema.serviceWorkerReviews.id, reviewId), eq(schema.serviceWorkerReviews.reviewer_account_id, accountId), eq(schema.serviceWorkerReviews.moderation_status, 'active'), isNull(schema.serviceWorkerReviews.worker_disputed_at), sql`${schema.serviceWorkerReviews.worker_response} is null`, gt(schema.serviceWorkerReviews.edit_deadline, new Date()))).returning();
  if (!updated) throw badRequest('This review can no longer be edited. The 7-day edit window may have ended or the employee has responded or disputed it.');
  return updated;
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

async function logComplaintEvent(tx: any, caseId: string, actorId: string, eventType: string, note?: string | null) {
  await tx.insert(schema.serviceComplaintCaseEvents).values({
    complaint_case_id: caseId, actor_account_id: actorId, event_type: eventType, note: note ?? null,
  });
}

export async function createServiceComplaint(accountId: string, requestId: string, dto: any) {
  const request = await db.query.serviceRequests.findFirst({ where: (t, { eq }) => eq(t.id, requestId) });
  if (!request || request.requester_account_id !== accountId) throw forbidden('You can only report a service you requested');
  if (!['accepted', 'in_progress', 'completed'].includes(request.status)) throw badRequest('A complaint can be filed after a provider accepts the service');
  const accepted = await db.query.serviceOffers.findFirst({ where: (t, { and, eq }) => and(eq(t.request_id, request.id), eq(t.status, 'accepted')) });
  if (!accepted) throw badRequest('The service has no accepted provider');
  const subjectType = String(dto.subject_type ?? '');
  let subjectId: string;
  let assignmentId: string | null = null;
  if (subjectType === 'provider') {
    const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.id, accepted.provider_id) });
    if (!provider) throw notFound('Service provider not found');
    subjectId = provider.account_id;
  } else if (subjectType === 'worker') {
    const assignment = await db.query.serviceAssignments.findFirst({ where: (t, { and, eq }) => and(
      eq(t.id, String(dto.assignment_id ?? '')), eq(t.request_id, request.id), eq(t.provider_id, accepted.provider_id),
    ) });
    if (!assignment) throw badRequest('Choose a worker assigned to this service');
    subjectId = assignment.worker_account_id;
    assignmentId = assignment.id;
  } else throw badRequest('Choose the provider or an assigned worker');
  const category = String(dto.category ?? '').trim();
  const allowedCategories = ['service_quality', 'communication', 'safety', 'billing', 'other'];
  if (!allowedCategories.includes(category)) throw badRequest('Choose a complaint category');
  const description = String(dto.description ?? '').trim().slice(0, 4000);
  if (description.length < 10) throw badRequest('Describe what happened in at least 10 characters');
  const [caseRow] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(schema.serviceComplaintCases).values({
      request_id: request.id, reporter_account_id: accountId, subject_type: subjectType,
      subject_account_id: subjectId, assignment_id: assignmentId, category, description,
    }).returning();
    await logComplaintEvent(tx, created.id, accountId, 'created', category);
    return [created];
  });
  await notifyAccount(subjectId, `complaint-created:${caseRow.id}`, 'complaint', 'A service complaint was filed', `A client opened a ${category.replaceAll('_', ' ')} case about this service. Review the case and respond.`, subjectType === 'worker' ? '/dashboard/work' : '/dashboard/provider/requests');
  return { id: caseRow.id, status: caseRow.status, subject_type: caseRow.subject_type };
}

export async function listMyServiceComplaints(accountId: string) {
  const rows = await db.select({ complaint: schema.serviceComplaintCases, request: schema.serviceRequests, service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.serviceComplaintCases)
    .innerJoin(schema.serviceRequests, eq(schema.serviceComplaintCases.request_id, schema.serviceRequests.id))
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .innerJoin(schema.serviceProviders, eq(schema.providerServices.provider_id, schema.serviceProviders.id))
    .where(or(eq(schema.serviceComplaintCases.reporter_account_id, accountId), eq(schema.serviceComplaintCases.subject_account_id, accountId)))
    .orderBy(desc(schema.serviceComplaintCases.created_at)).limit(100);
  if (rows.length) await db.insert(schema.serviceComplaintCaseEvents).values(rows.map(({ complaint }) => ({
    complaint_case_id: complaint.id, actor_account_id: accountId, event_type: 'viewed', note: null,
  })));
  const evidence = rows.length ? await db.select({ id: schema.serviceComplaintEvidence.id, complaint_case_id: schema.serviceComplaintEvidence.complaint_case_id, file_name: schema.serviceComplaintEvidence.file_name, mime_type: schema.serviceComplaintEvidence.mime_type, size_bytes: schema.serviceComplaintEvidence.size_bytes, uploader_account_id: schema.serviceComplaintEvidence.uploader_account_id, created_at: schema.serviceComplaintEvidence.created_at }).from(schema.serviceComplaintEvidence).where(inArray(schema.serviceComplaintEvidence.complaint_case_id, rows.map(({ complaint }) => complaint.id))) : [];
  return rows.map(({ complaint, request, service, provider }) => {
    const { investigation_note: _privateInvestigationNote, ...participantComplaint } = complaint;
    return {
    ...participantComplaint, service_request_id: request.id, request_summary: request.summary,
    service_title: service.title, provider_name: provider.display_name,
    evidence: evidence.filter((item) => item.complaint_case_id === complaint.id),
  }; });
}

export async function respondToServiceComplaint(accountId: string, complaintId: string, dto: any) {
  const response = String(dto.response ?? '').trim().slice(0, 3000);
  if (response.length < 5) throw badRequest('Write a response before submitting');
  const complaint = await db.query.serviceComplaintCases.findFirst({ where: (t, { eq }) => eq(t.id, complaintId) });
  if (!complaint || complaint.subject_account_id !== accountId) throw forbidden('Only the organization or worker named in the complaint can respond');
  if (['resolved', 'dismissed'].includes(complaint.status)) throw badRequest('This complaint is already closed');
  const [updated] = await db.transaction(async (tx) => {
    const result = await tx.update(schema.serviceComplaintCases).set({
      subject_response: response, status: complaint.status === 'open' ? 'in_review' : complaint.status, updated_at: new Date(),
    }).where(and(eq(schema.serviceComplaintCases.id, complaintId), inArray(schema.serviceComplaintCases.status, ['open', 'in_review']))).returning();
    if (result[0]) await logComplaintEvent(tx, complaint.id, accountId, 'subject_response', response);
    return result;
  });
  if (!updated) throw badRequest('This complaint is already closed');
  await notifyAccount(complaint.reporter_account_id, `complaint-response:${complaint.id}:${updated.updated_at.getTime()}`, 'complaint', 'A response was added to your service complaint', 'The organization or worker added a response to your case.', '/dashboard/requests');
  return { id: updated.id, status: updated.status, subject_response: updated.subject_response };
}

export async function listOpenServiceComplaints(adminId: string) {
  const rows = await db.select({ complaint: schema.serviceComplaintCases, request: schema.serviceRequests, service: schema.providerServices, provider: schema.serviceProviders })
    .from(schema.serviceComplaintCases)
    .innerJoin(schema.serviceRequests, eq(schema.serviceComplaintCases.request_id, schema.serviceRequests.id))
    .innerJoin(schema.providerServices, eq(schema.serviceRequests.provider_service_id, schema.providerServices.id))
    .innerJoin(schema.serviceProviders, eq(schema.providerServices.provider_id, schema.serviceProviders.id))
    .where(inArray(schema.serviceComplaintCases.status, ['open', 'in_review']))
    .orderBy(desc(schema.serviceComplaintCases.created_at)).limit(100);
  if (rows.length) await db.insert(schema.serviceComplaintCaseEvents).values(rows.map(({ complaint }) => ({
    complaint_case_id: complaint.id, actor_account_id: adminId, event_type: 'admin_viewed', note: null,
  })));
  const personIds = [...new Set(rows.map(({ complaint }) => complaint.subject_account_id))];
  const names = personIds.length ? await db.select({ id: schema.accounts.id, first_name: schema.personProfiles.first_name, last_name: schema.personProfiles.last_name, common_name: schema.personProfiles.common_name })
    .from(schema.accounts).leftJoin(schema.personProfiles, eq(schema.personProfiles.owner_account_id, schema.accounts.id)).where(inArray(schema.accounts.id, personIds)) : [];
  const nameMap = new Map(names.map((row) => [row.id, row.common_name?.trim() || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()]));
  const evidence = rows.length ? await db.select({ id: schema.serviceComplaintEvidence.id, complaint_case_id: schema.serviceComplaintEvidence.complaint_case_id, file_name: schema.serviceComplaintEvidence.file_name, mime_type: schema.serviceComplaintEvidence.mime_type, size_bytes: schema.serviceComplaintEvidence.size_bytes, created_at: schema.serviceComplaintEvidence.created_at }).from(schema.serviceComplaintEvidence).where(inArray(schema.serviceComplaintEvidence.complaint_case_id, rows.map(({ complaint }) => complaint.id))) : [];
  return rows.map(({ complaint, request, service, provider }) => ({
    ...complaint, request_summary: request.summary, service_title: service.title,
    provider_name: provider.display_name, subject_name: nameMap.get(complaint.subject_account_id) || 'Provider organization',
    evidence: evidence.filter((item) => item.complaint_case_id === complaint.id),
  }));
}

export async function resolveServiceComplaint(adminId: string, complaintId: string, dto: any) {
  const outcome = String(dto.outcome ?? '');
  if (!['resolved', 'dismissed'].includes(outcome)) throw badRequest('Choose resolve or dismiss');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (note.length < 4) throw badRequest('Add a resolution note');
  const investigationNote = String(dto.investigation_note ?? '').trim().slice(0, 5000) || null;
  const complaint = await db.query.serviceComplaintCases.findFirst({ where: (t, { eq }) => eq(t.id, complaintId) });
  if (!complaint) throw notFound('Complaint case not found');
  const [updated] = await db.transaction(async (tx) => {
    const result = await tx.update(schema.serviceComplaintCases).set({
      status: outcome as 'resolved' | 'dismissed', resolution_note: note, investigation_note: investigationNote, resolved_by_account_id: adminId, resolved_at: new Date(), updated_at: new Date(),
    }).where(and(eq(schema.serviceComplaintCases.id, complaintId), inArray(schema.serviceComplaintCases.status, ['open', 'in_review']))).returning();
    if (result[0]) await logComplaintEvent(tx, complaintId, adminId, outcome, note);
    return result;
  });
  if (!updated) throw notFound('Open complaint not found');
  await notifyAccount(complaint.reporter_account_id, `complaint-decision-reporter:${complaint.id}:${updated.updated_at.getTime()}`, 'complaint', 'Your service complaint was reviewed', `The platform ${outcome === 'resolved' ? 'resolved' : 'dismissed'} the case. Review the decision and appeal within 14 days if needed.`, '/dashboard/requests');
  await notifyAccount(complaint.subject_account_id, `complaint-decision-subject:${complaint.id}:${updated.updated_at.getTime()}`, 'complaint', 'A service complaint decision was made', `The platform ${outcome === 'resolved' ? 'resolved' : 'dismissed'} a complaint about this service.`, complaint.subject_type === 'worker' ? '/dashboard/work' : '/dashboard/provider/requests');
  return { id: updated.id, status: updated.status };
}

export async function submitServiceComplaintAppeal(accountId: string, complaintId: string, dto: any) {
  const complaint = await db.query.serviceComplaintCases.findFirst({ where: (t, { eq }) => eq(t.id, complaintId) });
  if (!complaint || complaint.reporter_account_id !== accountId) throw forbidden('Only the client who filed this case can appeal it');
  if (!['resolved', 'dismissed'].includes(complaint.status) || complaint.appealed_at) throw badRequest('This complaint is not eligible for another appeal');
  if (!complaint.resolved_at || Date.now() - complaint.resolved_at.getTime() > 14 * 24 * 60 * 60 * 1000) throw badRequest('The 14-day appeal window has closed');
  const appealNote = String(dto.appeal_note ?? '').trim().slice(0, 3000);
  if (appealNote.length < 20) throw badRequest('Explain why you are appealing (at least 20 characters)');
  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(schema.serviceComplaintCases).set({ status: 'in_review', appeal_note: appealNote, appealed_at: new Date(), resolved_at: null, resolved_by_account_id: null, updated_at: new Date() })
      .where(and(eq(schema.serviceComplaintCases.id, complaint.id), inArray(schema.serviceComplaintCases.status, ['resolved', 'dismissed']), isNull(schema.serviceComplaintCases.appealed_at))).returning();
    if (rows[0]) await logComplaintEvent(tx, complaint.id, accountId, 'appeal_submitted', appealNote);
    return rows;
  });
  if (!updated) throw badRequest('This complaint was already appealed');
  await notifyAccount(complaint.subject_account_id, `complaint-appeal:${complaint.id}`, 'complaint', 'A client appealed a complaint decision', 'The platform reopened a service case after a client appeal.', complaint.subject_type === 'worker' ? '/dashboard/work' : '/dashboard/provider/requests');
  return { id: updated.id, status: updated.status };
}

export async function addServiceComplaintEvidence(accountId: string, complaintId: string, dto: any) {
  const complaint = await db.query.serviceComplaintCases.findFirst({ where: (t, { eq }) => eq(t.id, complaintId) });
  if (!complaint || ![complaint.reporter_account_id, complaint.subject_account_id].includes(accountId)) throw forbidden('Only the client and named subject can add case evidence');
  if (!['open', 'in_review'].includes(complaint.status)) throw badRequest('Evidence upload is closed for this case');
  const count = await db.select({ id: schema.serviceComplaintEvidence.id }).from(schema.serviceComplaintEvidence).where(eq(schema.serviceComplaintEvidence.complaint_case_id, complaintId));
  if (count.length >= 5) throw badRequest('A complaint can include up to five evidence files');
  const fileName = String(dto.file_name ?? '').trim().replace(/[\\/\0-\x1f]/g, '_').slice(0, 255);
  const mimeType = String(dto.mime_type ?? '').trim().toLowerCase();
  const encoded = String(dto.base64 ?? '').trim();
  if (!fileName || !['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType) || !encoded || encoded.length > 2_800_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw badRequest('Upload a PDF, JPEG, or PNG file up to 2 MB');
  const document = Buffer.from(encoded, 'base64');
  if (!document.length || document.length > 2 * 1024 * 1024) throw badRequest('Evidence files must not exceed 2 MB');
  const signatureMatches = mimeType === 'application/pdf' ? document.subarray(0, 5).toString('ascii') === '%PDF-'
    : mimeType === 'image/png' ? document.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : document[0] === 0xff && document[1] === 0xd8 && document[2] === 0xff;
  if (!signatureMatches) throw badRequest('The evidence content does not match its file type');
  const [evidence] = await db.insert(schema.serviceComplaintEvidence).values({ complaint_case_id: complaintId, uploader_account_id: accountId, file_name: fileName, mime_type: mimeType, size_bytes: document.length, document }).returning({ id: schema.serviceComplaintEvidence.id, file_name: schema.serviceComplaintEvidence.file_name });
  await db.insert(schema.serviceComplaintCaseEvents).values({ complaint_case_id: complaintId, actor_account_id: accountId, event_type: 'evidence_uploaded', note: fileName });
  const otherParty = accountId === complaint.reporter_account_id ? complaint.subject_account_id : complaint.reporter_account_id;
  await notifyAccount(otherParty, `complaint-evidence:${complaintId}:${evidence.id}`, 'complaint', 'New evidence was added to a service case', 'A participant uploaded evidence to the complaint case.', accountId === complaint.reporter_account_id ? (complaint.subject_type === 'worker' ? '/dashboard/work' : '/dashboard/provider/requests') : '/dashboard/requests');
  return evidence;
}

export async function getServiceComplaintEvidence(accountId: string, complaintId: string, evidenceId: string) {
  const complaint = await db.query.serviceComplaintCases.findFirst({ where: (t, { eq }) => eq(t.id, complaintId) });
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!complaint || !account || (complaint.reporter_account_id !== accountId && complaint.subject_account_id !== accountId && account.role !== 'system_admin')) throw forbidden('You cannot view this complaint evidence');
  const evidence = await db.query.serviceComplaintEvidence.findFirst({ where: (t, { and, eq }) => and(eq(t.id, evidenceId), eq(t.complaint_case_id, complaintId)) });
  if (!evidence) throw notFound('Complaint evidence not found');
  return { file_name: evidence.file_name, mime_type: evidence.mime_type, base64: Buffer.from(evidence.document).toString('base64') };
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
    for (const assignment of assignedWorkers) {
      const workerProfile = await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray }) => and(eq(t.owner_account_id, assignment.worker_account_id), inArray(t.member_type, ['employee', 'student', 'underage'])) });
      if (workerProfile && Date.now() - new Date(workerProfile.birthdate).getTime() < 18 * 365.2425 * 24 * 60 * 60 * 1000) {
        const guardianConsent = await db.query.serviceGuardianConsents.findFirst({ where: (t, { and, eq, isNull }) => and(eq(t.request_id, request.id), eq(t.minor_account_id, assignment.worker_account_id), eq(t.guardian_account_id, request.requester_account_id), isNull(t.revoked_at)) });
        if (provider.category !== 'school' || !guardianConsent) throw forbidden('A current family guardian consent is required before this school service can start with a minor assigned');
      }
    }
  }
  await db.update(schema.serviceRequests).set({ status: dto.status, updated_at: new Date() }).where(eq(schema.serviceRequests.id, request.id));
  return { status: dto.status };
}
