import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';
import { recordActivity } from './platform-controls';

async function requireCareerAccount(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq, isNull }) => and(eq(t.id, accountId), isNull(t.deleted_at)) });
  if (!account || !['individual', 'user'].includes(account.role)) throw forbidden('Career tools are available to individual and employee accounts');
  return account;
}

async function requireEmployer(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account || account.role !== 'admin' || !['business', 'school', 'institution'].includes(account.account_type)) throw forbidden('Only organization admins can manage employment records');
  const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  if (!provider) throw badRequest('Set up a provider profile before managing career records');
  return { account, provider };
}

async function requireAdultCareerAccount(accountId: string) {
  const person = await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray, isNull }) => and(
    eq(t.owner_account_id, accountId), inArray(t.member_type, ['self', 'employee']), isNull(t.deleted_at),
  ) });
  const ageMs = person ? Date.now() - new Date(person.birthdate).getTime() : 0;
  if (!person || ageMs < 18 * 365.2425 * 24 * 60 * 60 * 1000) throw forbidden('Externally shareable career links are available only to adults');
}

function cleanSkills(value: unknown) {
  if (!Array.isArray(value)) throw badRequest('Skills must be a list');
  return [...new Set(value.map((item) => String(item).trim().slice(0, 80)).filter(Boolean))].slice(0, 40);
}

function cleanCareerList(value: unknown, maxItems: number, maxLength: number, label: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw badRequest(`${label} must be a list`);
  return [...new Set(value.map((item) => String(item).trim().slice(0, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function cleanReferences(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5) throw badRequest('Add up to 5 professional references');
  return value.map((raw: any) => {
    const reference = {
      name: String(raw?.name ?? '').trim().slice(0, 120),
      role: String(raw?.role ?? '').trim().slice(0, 120),
      organization: String(raw?.organization ?? '').trim().slice(0, 160),
      contact: String(raw?.contact ?? '').trim().slice(0, 200),
      permission_confirmed: raw?.permission_confirmed === true,
    };
    if (!reference.name || !reference.contact || !reference.permission_confirmed) throw badRequest('Each reference needs a name, contact method, and your confirmation that they agreed to be contacted');
    return reference;
  });
}

async function logCareerEvent(recordId: string, actorId: string, eventType: string, note: string | null = null) {
  await db.insert(schema.careerHistoryEvents).values({ career_record_id: recordId, actor_account_id: actorId, event_type: eventType, note });
}

function validDate(value: unknown, label: string) {
  const dateValue = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || Number.isNaN(new Date(`${dateValue}T00:00:00.000Z`).getTime())) throw badRequest(`Enter a valid ${label}`);
  return dateValue;
}

export async function getMyCareer(accountId: string) {
  await requireCareerAccount(accountId);
  const profile = await db.query.careerProfiles.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  const records = await db.select({ history: schema.careerHistory })
    .from(schema.careerHistory)
    .where(eq(schema.careerHistory.worker_account_id, accountId))
    .orderBy(desc(schema.careerHistory.started_on));
  const recordIds = records.map(({ history }) => history.id);
  const historyEvents = recordIds.length ? await db.select().from(schema.careerHistoryEvents)
    .where(inArray(schema.careerHistoryEvents.career_record_id, recordIds)).orderBy(desc(schema.careerHistoryEvents.created_at)) : [];
  await recordActivity(accountId, 'career_record_access', accountId, 'succeeded');
  const grants = await db.query.careerShareGrants.findMany({
    where: (t, { eq }) => eq(t.worker_account_id, accountId),
    orderBy: (t, { desc }) => [desc(t.created_at)],
  });
  return {
    profile: profile ?? { headline: '', summary: '', skills: [] },
    history: records.map(({ history }) => ({
      ...history,
      organization_name: history.organization_name,
      correction_history: historyEvents.filter((event) => event.career_record_id === history.id),
    })),
    shares: grants.map((grant) => ({
      id: grant.id,
      token: grant.token,
      purpose: grant.purpose,
      expires_at: grant.expires_at,
      revoked_at: grant.revoked_at,
      history_record_ids: grant.history_record_ids,
    })),
  };
}

export async function saveMyCareer(accountId: string, dto: any) {
  await requireCareerAccount(accountId);
  const headline = String(dto.headline ?? '').trim().slice(0, 200) || null;
  const summary = String(dto.summary ?? '').trim().slice(0, 3000) || null;
  const skills = cleanSkills(dto.skills ?? []);
  const qualifications = cleanCareerList(dto.qualifications, 20, 200, 'Qualifications');
  const availability = String(dto.availability ?? '').trim().slice(0, 80) || null;
  const preferredEmploymentTypes = cleanCareerList(dto.preferred_employment_types, 8, 40, 'Employment preferences');
  const professionalReferences = cleanReferences(dto.professional_references);
  const values = { account_id: accountId, headline, summary, skills, qualifications, availability, preferred_employment_types: preferredEmploymentTypes, professional_references: professionalReferences };
  const [profile] = await db.insert(schema.careerProfiles).values(values)
    .onConflictDoUpdate({ target: schema.careerProfiles.account_id, set: { ...values, updated_at: new Date() } })
    .returning();
  return profile;
}

export async function listEmployerCareerRecords(accountId: string) {
  const { account } = await requireEmployer(accountId);
  const rows = await db.select({ history: schema.careerHistory, worker: schema.accounts, profile: schema.personProfiles })
    .from(schema.careerHistory)
    .innerJoin(schema.accounts, eq(schema.careerHistory.worker_account_id, schema.accounts.id))
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.owner_account_id, schema.accounts.id))
    .where(eq(schema.careerHistory.organization_account_id, account.id))
    .orderBy(desc(schema.careerHistory.created_at));
  await recordActivity(accountId, 'career_record_access', accountId, 'succeeded');
  return rows.map(({ history, worker, profile }) => ({
    ...history,
    worker_name: profile.common_name?.trim() || `${profile.first_name} ${profile.last_name}`.trim(),
    worker_username: worker.username,
  }));
}

export async function createEmployerCareerRecord(accountId: string, dto: any) {
  const { account, provider } = await requireEmployer(accountId);
  const workerId = String(dto.worker_account_id ?? '');
  const worker = await db.query.accounts.findFirst({ where: (t, { and, eq, isNull }) => and(
    eq(t.id, workerId), inArray(t.role, ['user', 'individual']), eq(t.status, 'active'), isNull(t.deleted_at),
  ) });
  const membership = worker ? await db.query.organizationMemberships.findFirst({ where: (t, { and, eq }) => and(
    eq(t.organization_account_id, account.id), eq(t.worker_account_id, worker.id), eq(t.status, 'active'),
  ) }) : null;
  if (worker && !membership) throw badRequest('Choose an active employee linked to your organization');
  const profile = worker ? await db.query.personProfiles.findFirst({ where: (t, { and, eq }) => and(
    eq(t.owner_account_id, worker.id), eq(t.member_type, 'employee'),
  ) }) : null;
  if (!worker || !profile) throw badRequest('Choose an active employee member account managed by your organization');
  const position = String(dto.position ?? '').trim().slice(0, 150);
  if (!position) throw badRequest('Enter the employee role or position');
  const startedOn = validDate(dto.started_on, 'start date');
  const endedOn = dto.ended_on ? validDate(dto.ended_on, 'end date') : null;
  if (endedOn && endedOn < startedOn) throw badRequest('End date cannot be before start date');
  const [record] = await db.insert(schema.careerHistory).values({
    worker_account_id: worker.id,
    organization_account_id: account.id,
    organization_name: provider.display_name,
    provider_id: provider.id,
    position,
    started_on: startedOn,
    ended_on: endedOn,
    verification_status: 'pending',
  }).returning();
  await logCareerEvent(record.id, accountId, 'created', `Submitted ${position} employment record`);
  return { ...record, worker_name: profile.common_name?.trim() || `${profile.first_name} ${profile.last_name}`.trim() };
}

export async function respondToCareerRecord(accountId: string, recordId: string, dto: any) {
  await requireCareerAccount(accountId);
  const record = await db.query.careerHistory.findFirst({ where: (t, { eq }) => eq(t.id, recordId) });
  if (!record || record.worker_account_id !== accountId) throw forbidden('This employment record does not belong to your account');
  if (record.verification_status !== 'pending') throw badRequest('This record is no longer awaiting your response');
  const action = String(dto.action ?? '');
  if (!['acknowledge', 'dispute'].includes(action)) throw badRequest('Choose acknowledge or dispute');
  const note = String(dto.note ?? '').trim().slice(0, 2000) || null;
  if (action === 'dispute' && !note) throw badRequest('Add a short note explaining the correction you are requesting');
  const [updated] = await db.update(schema.careerHistory).set({
    verification_status: action === 'acknowledge' ? 'verified' : 'disputed',
    verified_by_account_id: action === 'acknowledge' ? record.organization_account_id : null,
    worker_acknowledged_at: new Date(),
    worker_note: note,
    updated_at: new Date(),
  }).where(eq(schema.careerHistory.id, record.id)).returning();
  await logCareerEvent(record.id, accountId, action, note);
  return updated;
}

export async function requestCareerCorrection(accountId: string, recordId: string, dto: any) {
  await requireCareerAccount(accountId);
  const record = await db.query.careerHistory.findFirst({ where: (t, { eq }) => eq(t.id, recordId) });
  if (!record || record.worker_account_id !== accountId) throw forbidden('This employment record does not belong to your account');
  if (record.verification_status !== 'verified') throw badRequest('Only verified records can start a correction request');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (note.length < 8) throw badRequest('Describe the correction you are requesting');
  const [updated] = await db.update(schema.careerHistory).set({
    verification_status: 'disputed', worker_note: note, verified_by_account_id: null, updated_at: new Date(),
  }).where(and(eq(schema.careerHistory.id, record.id), eq(schema.careerHistory.verification_status, 'verified'))).returning();
  if (!updated) throw badRequest('This record has already changed');
  await logCareerEvent(record.id, accountId, 'correction_requested', note);
  return updated;
}

export async function resolveEmployerCareerRecord(accountId: string, recordId: string, dto: any) {
  const { account } = await requireEmployer(accountId);
  const record = await db.query.careerHistory.findFirst({ where: (t, { eq }) => eq(t.id, recordId) });
  if (!record || record.organization_account_id !== account.id) throw forbidden('This employment record belongs to another organization');
  if (record.verification_status !== 'disputed') throw badRequest('Only a disputed record can be resolved');
  const action = String(dto.action ?? '');
  if (!['confirm', 'reject'].includes(action)) throw badRequest('Choose confirm or reject');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (!note) throw badRequest('Add a note explaining the decision');
  const [updated] = await db.update(schema.careerHistory).set({
    verification_status: action === 'confirm' ? 'pending' : 'rejected',
    verified_by_account_id: null,
    worker_acknowledged_at: action === 'confirm' ? null : record.worker_acknowledged_at,
    moderation_note: note,
    updated_at: new Date(),
  }).where(eq(schema.careerHistory.id, record.id)).returning();
  await logCareerEvent(record.id, accountId, action === 'confirm' ? 'correction_confirmed' : 'record_rejected', note);
  return updated;
}

export async function createCareerShare(accountId: string, dto: any) {
  await requireCareerAccount(accountId);
  await requireAdultCareerAccount(accountId);
  const ids: string[] = Array.isArray(dto.history_record_ids) ? [...new Set<string>(dto.history_record_ids.map((item: unknown) => String(item)))].slice(0, 20) : [];
  if (dto.include_profile !== false && !(await db.query.careerProfiles.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) }))) {
    await saveMyCareer(accountId, { headline: '', summary: '', skills: [] });
  }
  if (dto.include_profile === false && !ids.length) throw badRequest('Choose a verified work record to share');
  if (ids.length) {
    const rows = await db.query.careerHistory.findMany({ where: (t, { and, eq, inArray }) => and(
      eq(t.worker_account_id, accountId), eq(t.verification_status, 'verified'), inArray(t.id, ids),
    ) });
    if (rows.length !== ids.length) throw badRequest('Only your verified work records can be shared');
  }
  const purpose = String(dto.purpose ?? '').trim().slice(0, 240);
  if (!purpose) throw badRequest('Enter why you are sharing your career profile');
  const durationDays = Number(dto.duration_days ?? 14);
  if (![7, 14, 30].includes(durationDays)) throw badRequest('Choose a 7, 14, or 30 day link duration');
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const [grant] = await db.insert(schema.careerShareGrants).values({
    worker_account_id: accountId,
    include_profile: dto.include_profile !== false,
    include_extended_profile: dto.include_extended_profile === true,
    history_record_ids: ids,
    purpose,
    expires_at: expiresAt,
  }).returning();
  return { id: grant.id, token: grant.token, purpose: grant.purpose, expires_at: grant.expires_at };
}

export async function revokeCareerShare(accountId: string, shareId: string) {
  await requireCareerAccount(accountId);
  const grant = await db.query.careerShareGrants.findFirst({ where: (t, { eq }) => eq(t.id, shareId) });
  if (!grant || grant.worker_account_id !== accountId) throw forbidden('This share link does not belong to your account');
  await db.update(schema.careerShareGrants).set({ revoked_at: new Date() }).where(eq(schema.careerShareGrants.id, grant.id));
  return { message: 'Share link revoked' };
}

export async function getSharedCareer(token: string) {
  const grant = await db.query.careerShareGrants.findFirst({ where: (t, { and, eq, isNull, gt }) => and(
    eq(t.token, token), isNull(t.revoked_at), gt(t.expires_at, new Date()),
  ) });
  if (!grant) throw notFound('This career link is invalid, expired, or revoked');
  const agePerson = await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray, isNull }) => and(
    eq(t.owner_account_id, grant.worker_account_id), inArray(t.member_type, ['self', 'employee']), isNull(t.deleted_at),
  ) });
  const ageMs = agePerson ? Date.now() - new Date(agePerson.birthdate).getTime() : 0;
  if (!agePerson || ageMs < 18 * 365.2425 * 24 * 60 * 60 * 1000) throw notFound('This career link is unavailable');
  const profile = grant.include_profile ? await db.query.careerProfiles.findFirst({ where: (t, { eq }) => eq(t.account_id, grant.worker_account_id) }) : null;
  const person = grant.include_profile ? await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray }) => and(
    eq(t.owner_account_id, grant.worker_account_id), inArray(t.member_type, ['employee', 'self']),
  ) }) : null;
  const historyIds = grant.history_record_ids ?? [];
  const history = historyIds.length ? await db.select({ record: schema.careerHistory })
    .from(schema.careerHistory)
    .where(and(inArray(schema.careerHistory.id, historyIds), eq(schema.careerHistory.worker_account_id, grant.worker_account_id), eq(schema.careerHistory.verification_status, 'verified'))) : [];
  return {
    purpose: grant.purpose,
    expires_at: grant.expires_at,
    profile: profile ? {
      display_name: person ? `${person.first_name} ${person.last_name}`.trim() : null,
      headline: profile.headline,
      summary: profile.summary,
      skills: profile.skills,
      ...(grant.include_extended_profile ? {
        qualifications: profile.qualifications,
        availability: profile.availability,
        preferred_employment_types: profile.preferred_employment_types,
        professional_references: profile.professional_references,
      } : {}),
    } : null,
    history: history.map(({ record }) => ({ position: record.position, started_on: record.started_on, ended_on: record.ended_on, organization_name: record.organization_name })),
  };
}

export async function leaveOrganization(accountId: string) {
  const account = await requireCareerAccount(accountId);
  if (!['user', 'individual'].includes(account.role)) throw badRequest('This account is not currently managed by an organization');
  const [profile] = await db.select().from(schema.personProfiles).where(and(eq(schema.personProfiles.owner_account_id, account.id), eq(schema.personProfiles.member_type, 'employee'))).limit(1);
  if (!profile) throw badRequest('Only employee accounts can leave an organization through career settings');
  const activeJobs = await db.select({ id: schema.serviceAssignments.id })
    .from(schema.serviceAssignments)
    .innerJoin(schema.serviceRequests, eq(schema.serviceAssignments.request_id, schema.serviceRequests.id))
    .where(and(
      eq(schema.serviceAssignments.worker_account_id, account.id),
      eq(schema.serviceAssignments.status, 'active'),
      inArray(schema.serviceRequests.status, ['accepted', 'in_progress']),
    ));
  if (activeJobs.length) throw badRequest('Complete or have your organization reassign your active service work before leaving');
  const parentId = account.parent_account_id;
  const memberships = await db.query.organizationMemberships.findMany({ where: (t, { and, eq }) => and(eq(t.worker_account_id, account.id), eq(t.status, 'active')) });
  if (!parentId && !memberships.length) throw badRequest('This account is not currently managed by an organization');
  const leaving = memberships.find((membership) => membership.organization_account_id === parentId) ?? memberships[0];
  if (leaving) await db.update(schema.organizationMemberships).set({ status: 'ended', ended_at: new Date(), updated_at: new Date() }).where(eq(schema.organizationMemberships.id, leaving.id));
  if (memberships.some((membership) => membership.id !== leaving?.id)) return { message: 'This organization link ended. Your other organization memberships remain active.' };
  const parent = parentId ? await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, parentId) }) : null;
  await db.transaction(async (tx) => {
    if (parent?.account_type === 'business') {
      const entity = await tx.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, parentId!) });
      if (entity) await tx.delete(schema.businessMembers).where(and(eq(schema.businessMembers.business_id, entity.id), eq(schema.businessMembers.person_profile_id, profile.id)));
    } else if (parent?.account_type === 'school') {
      const entity = await tx.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, parentId!) });
      if (entity) await tx.delete(schema.schoolMembers).where(and(eq(schema.schoolMembers.school_id, entity.id), eq(schema.schoolMembers.person_profile_id, profile.id)));
    } else if (parent?.account_type === 'institution') {
      const entity = await tx.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, parentId!) });
      if (entity) await tx.delete(schema.institutionMembers).where(and(eq(schema.institutionMembers.institution_id, entity.id), eq(schema.institutionMembers.person_profile_id, profile.id)));
    }
    await tx.update(schema.accounts).set({ account_type: 'individual', role: 'individual', parent_account_id: null, is_reseller: false, updated_at: new Date() }).where(eq(schema.accounts.id, account.id));
  });
  return { message: 'Your account is now independent. Your career profile and verified work history remain available.' };
}
