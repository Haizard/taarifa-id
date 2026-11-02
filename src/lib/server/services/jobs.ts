import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';

const orgTypes = ['business', 'school', 'institution'];
const appStatuses = ['submitted', 'under_review', 'interview', 'offered', 'rejected', 'withdrawn', 'hired'];
const words = (value: unknown, max = 12) => Array.isArray(value) ? [...new Set(value.map((x) => String(x).trim().slice(0, 100)).filter(Boolean))].slice(0, max) : [];

async function workerAccount(id: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq, isNull, and }) => and(eq(t.id, id), isNull(t.deleted_at)) });
  if (!account || account.status !== 'active' || !['individual', 'user'].includes(account.role)) throw forbidden('Job tools are available to active individual and employee accounts');
  const person = await db.query.personProfiles.findFirst({ where: (t, { eq, isNull, and, inArray }) => and(
    eq(t.owner_account_id, id), isNull(t.deleted_at), inArray(t.member_type, ['self', 'employee']),
  ) });
  if (!person || Date.now() - new Date(person.birthdate).getTime() < 18 * 365.2425 * 24 * 60 * 60 * 1000) throw forbidden('Job discovery is only available to adult individual and employee profiles');
  return { account, person };
}

async function employer(id: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq, isNull, and }) => and(eq(t.id, id), isNull(t.deleted_at)) });
  if (!account || account.role !== 'admin' || !orgTypes.includes(account.account_type)) throw forbidden('Only organization admins can manage jobs');
  const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, id) });
  if (!provider) throw badRequest('Set up your organization provider profile before managing jobs');
  return { account, provider };
}

export async function getJobPreferences(accountId: string) {
  await workerAccount(accountId);
  return await db.query.careerProfiles.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) }) ?? {
    job_seeking: false, job_categories: [], job_locations: [], excluded_employer_account_ids: [],
  };
}

export async function saveJobPreferences(accountId: string, dto: any) {
  const { account } = await workerAccount(accountId);
  const current = await db.query.careerProfiles.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  const jobSeeking = dto.job_seeking === true;
  const categories = words(dto.job_categories);
  const locations = words(dto.job_locations, 20);
  const excluded = words(dto.excluded_employer_account_ids, 50);
  if (jobSeeking && (!categories.length || !locations.length)) throw badRequest('Choose at least one job category and location before becoming discoverable');
  const parentExcluded = account.parent_account_id ? [account.parent_account_id] : [];
  const values = {
    account_id: accountId,
    headline: current?.headline ?? null,
    summary: current?.summary ?? null,
    skills: current?.skills ?? [],
    job_seeking: jobSeeking,
    job_categories: categories,
    job_locations: locations,
    excluded_employer_account_ids: [...new Set([...excluded, ...parentExcluded])],
  };
  const [profile] = await db.insert(schema.careerProfiles).values(values)
    .onConflictDoUpdate({ target: schema.careerProfiles.account_id, set: { ...values, updated_at: new Date() } }).returning();
  if (!jobSeeking) await db.update(schema.jobInvitations).set({ status: 'expired', updated_at: new Date() })
    .where(and(eq(schema.jobInvitations.worker_account_id, accountId), eq(schema.jobInvitations.status, 'pending')));
  return profile;
}

export async function listJobs(accountId: string) {
  await workerAccount(accountId);
  const rows = await db.select({ job: schema.jobPostings, provider: schema.serviceProviders, org: schema.accounts })
    .from(schema.jobPostings)
    .innerJoin(schema.serviceProviders, eq(schema.jobPostings.provider_id, schema.serviceProviders.id))
    .innerJoin(schema.accounts, eq(schema.jobPostings.organization_account_id, schema.accounts.id))
    .where(and(eq(schema.jobPostings.status, 'open'), eq(schema.serviceProviders.accepting_requests, true)))
    .orderBy(desc(schema.jobPostings.created_at)).limit(100);
  const apps = await db.select({ job_id: schema.jobApplications.job_id, status: schema.jobApplications.status })
    .from(schema.jobApplications).where(eq(schema.jobApplications.worker_account_id, accountId));
  const appMap = new Map(apps.map((a) => [a.job_id, a.status]));
  return rows.filter(({ job }) => !job.closes_at || job.closes_at > new Date()).map(({ job, provider }) => ({
    ...job, organization_name: provider.display_name, organization_category: provider.category,
    application_status: appMap.get(job.id) ?? null,
  }));
}

export async function listMyApplications(accountId: string) {
  await workerAccount(accountId);
  const rows = await db.select({ application: schema.jobApplications, job: schema.jobPostings, provider: schema.serviceProviders })
    .from(schema.jobApplications).innerJoin(schema.jobPostings, eq(schema.jobApplications.job_id, schema.jobPostings.id))
    .innerJoin(schema.serviceProviders, eq(schema.jobPostings.provider_id, schema.serviceProviders.id))
    .where(eq(schema.jobApplications.worker_account_id, accountId)).orderBy(desc(schema.jobApplications.updated_at));
  return rows.map(({ application, job, provider }) => ({ ...application, job_title: job.title, organization_name: provider.display_name, location: job.location }));
}

export async function applyToJob(accountId: string, jobId: string, dto: any) {
  await workerAccount(accountId);
  const preferences = await getJobPreferences(accountId);
  const job = await db.query.jobPostings.findFirst({ where: (t, { eq }) => eq(t.id, jobId) });
  if (!job || job.status !== 'open' || (job.closes_at && job.closes_at <= new Date())) throw notFound('This job is no longer accepting applications');
  if (preferences.job_seeking !== true) throw forbidden('Turn on job seeking before applying');
  const previous = await db.query.jobApplications.findFirst({ where: (t, { and, eq }) => and(eq(t.job_id, jobId), eq(t.worker_account_id, accountId)) });
  if (previous && previous.status !== 'withdrawn') throw badRequest('You have already applied to this job');
  const selected = words(dto.shared_history_ids, 20);
  if (selected.length) {
    const rows = await db.query.careerHistory.findMany({ where: (t, { and, eq, inArray }) => and(
      eq(t.worker_account_id, accountId), eq(t.verification_status, 'verified'), inArray(t.id, selected),
    ) });
    if (rows.length !== selected.length) throw badRequest('Applications can include only your verified work records');
  }
  const values = {
    job_id: jobId, worker_account_id: accountId,
    cover_note: String(dto.cover_note ?? '').trim().slice(0, 3000) || null,
    shared_profile: dto.share_profile === true,
    shared_history_ids: selected,
  };
  const [application] = previous
    ? await db.update(schema.jobApplications).set({ ...values, status: 'submitted', updated_at: new Date() }).where(eq(schema.jobApplications.id, previous.id)).returning()
    : await db.insert(schema.jobApplications).values(values).returning();
  return application;
}

export async function withdrawApplication(accountId: string, applicationId: string) {
  await workerAccount(accountId);
  const [updated] = await db.update(schema.jobApplications).set({ status: 'withdrawn', shared_profile: false, shared_history_ids: [], updated_at: new Date() })
    .where(and(eq(schema.jobApplications.id, applicationId), eq(schema.jobApplications.worker_account_id, accountId), inArray(schema.jobApplications.status, ['submitted', 'under_review', 'interview', 'offered']))).returning();
  if (!updated) throw notFound('Application not found');
  return updated;
}

export async function listEmployerJobs(accountId: string) {
  const { account, provider } = await employer(accountId);
  const jobs = await db.select().from(schema.jobPostings).where(eq(schema.jobPostings.organization_account_id, account.id)).orderBy(desc(schema.jobPostings.created_at));
  const applications = jobs.length ? await db.select({ application: schema.jobApplications }).from(schema.jobApplications)
    .innerJoin(schema.jobPostings, eq(schema.jobApplications.job_id, schema.jobPostings.id))
    .where(eq(schema.jobPostings.organization_account_id, account.id)) : [];
  const counts = new Map<string, number>();
  for (const { application } of applications) if (application.status !== 'withdrawn') counts.set(application.job_id, (counts.get(application.job_id) ?? 0) + 1);
  return { provider: { id: provider.id, display_name: provider.display_name, category: provider.category }, jobs: jobs.map((job) => ({ ...job, application_count: counts.get(job.id) ?? 0 })) };
}

export async function createJob(accountId: string, dto: any) {
  const { account, provider } = await employer(accountId);
  const title = String(dto.title ?? '').trim().slice(0, 180);
  const category = String(dto.category ?? '').trim().slice(0, 80);
  const location = String(dto.location ?? '').trim().slice(0, 180);
  const employmentType = String(dto.employment_type ?? '').trim().slice(0, 40);
  const description = String(dto.description ?? '').trim().slice(0, 6000);
  if (!title || !category || !location || !employmentType || !description) throw badRequest('Complete the job title, category, location, employment type, and description');
  const closesAt = dto.closes_at ? new Date(dto.closes_at) : null;
  if (closesAt && (Number.isNaN(closesAt.getTime()) || closesAt <= new Date())) throw badRequest('Closing date must be in the future');
  const [job] = await db.insert(schema.jobPostings).values({
    organization_account_id: account.id, provider_id: provider.id, title, category, location,
    employment_type: employmentType, description,
    requirements: String(dto.requirements ?? '').trim().slice(0, 4000) || null,
    closes_at: closesAt,
  }).returning();
  return job;
}

export async function updateJob(accountId: string, jobId: string, dto: any) {
  const { account } = await employer(accountId);
  const [job] = await db.update(schema.jobPostings).set({ status: dto.status === 'closed' ? 'closed' : 'open', updated_at: new Date() })
    .where(and(eq(schema.jobPostings.id, jobId), eq(schema.jobPostings.organization_account_id, account.id))).returning();
  if (!job) throw notFound('Job not found');
  return job;
}

export async function searchCandidates(accountId: string, query: URLSearchParams) {
  const { account } = await employer(accountId);
  const category = query.get('category')?.toLowerCase().trim();
  const location = query.get('location')?.toLowerCase().trim();
  const rows = await db.select({ profile: schema.careerProfiles, person: schema.personProfiles, account: schema.accounts })
    .from(schema.careerProfiles).innerJoin(schema.personProfiles, eq(schema.careerProfiles.account_id, schema.personProfiles.owner_account_id))
    .innerJoin(schema.accounts, eq(schema.careerProfiles.account_id, schema.accounts.id))
    .where(and(eq(schema.careerProfiles.job_seeking, true), inArray(schema.personProfiles.member_type, ['self', 'employee']), eq(schema.accounts.status, 'active'), isNull(schema.accounts.deleted_at), isNull(schema.personProfiles.deleted_at)))
    .limit(250);
  const result = rows.filter(({ profile, person, account: worker }) => {
    const age = Date.now() - new Date(person.birthdate).getTime();
    if (age < 18 * 365.2425 * 24 * 60 * 60 * 1000) return false;
    const excluded = profile.excluded_employer_account_ids ?? [];
    return !excluded.includes(account.id) && worker.parent_account_id !== account.id && worker.id !== account.id
      && (!category || (profile.job_categories ?? []).some((v) => v.toLowerCase().includes(category)))
      && (!location || (profile.job_locations ?? []).some((v) => v.toLowerCase().includes(location)));
  }).slice(0, 100);
  return result.map(({ profile, person }) => ({
    account_id: profile.account_id,
    display_name: person.common_name?.trim() || `${person.first_name} ${person.last_name}`.trim(),
    headline: profile.headline, skills: profile.skills, categories: profile.job_categories, locations: profile.job_locations,
    summary: profile.summary,
  }));
}

export async function listJobApplications(accountId: string, jobId: string) {
  const { account } = await employer(accountId);
  const job = await db.query.jobPostings.findFirst({ where: (t, { and, eq }) => and(eq(t.id, jobId), eq(t.organization_account_id, account.id)) });
  if (!job) throw notFound('Job not found');
  const rows = await db.select({ application: schema.jobApplications, person: schema.personProfiles, profile: schema.careerProfiles })
    .from(schema.jobApplications).innerJoin(schema.personProfiles, eq(schema.jobApplications.worker_account_id, schema.personProfiles.owner_account_id))
    .leftJoin(schema.careerProfiles, eq(schema.jobApplications.worker_account_id, schema.careerProfiles.account_id))
    .where(and(eq(schema.jobApplications.job_id, job.id), inArray(schema.personProfiles.member_type, ['self', 'employee'])))
    .orderBy(desc(schema.jobApplications.created_at));
  return Promise.all(rows.map(async ({ application, person, profile }) => {
    const history = application.shared_history_ids?.length ? await db.select({ record: schema.careerHistory }).from(schema.careerHistory)
      .where(and(inArray(schema.careerHistory.id, application.shared_history_ids), eq(schema.careerHistory.worker_account_id, application.worker_account_id), eq(schema.careerHistory.verification_status, 'verified'))) : [];
    return {
      id: application.id, status: application.status, cover_note: application.cover_note,
      created_at: application.created_at, shared_profile: application.shared_profile,
      applicant_name: person.common_name?.trim() || `${person.first_name} ${person.last_name}`.trim(),
      career: application.shared_profile ? { headline: profile?.headline, summary: profile?.summary, skills: profile?.skills } : null,
      verified_history: history.map(({ record }) => ({ organization_name: record.organization_name, position: record.position, started_on: record.started_on, ended_on: record.ended_on })),
    };
  }));
}

export async function updateApplication(accountId: string, applicationId: string, dto: any) {
  const { account } = await employer(accountId);
  const status = String(dto.status ?? '');
  if (!appStatuses.includes(status) || ['withdrawn', 'submitted'].includes(status)) throw badRequest('Choose an employer review status');
  const [updated] = await db.update(schema.jobApplications).set({ status, employer_note: String(dto.employer_note ?? '').trim().slice(0, 2000) || null, updated_at: new Date() })
    .where(and(
      eq(schema.jobApplications.id, applicationId),
      inArray(schema.jobApplications.job_id, db.select({ id: schema.jobPostings.id }).from(schema.jobPostings).where(eq(schema.jobPostings.organization_account_id, account.id))),
    )).returning();
  if (!updated) throw notFound('Application not found');
  return updated;
}

async function applicationParticipant(accountId: string, applicationId: string) {
  const rows = await db.select({ application: schema.jobApplications, job: schema.jobPostings })
    .from(schema.jobApplications).innerJoin(schema.jobPostings, eq(schema.jobApplications.job_id, schema.jobPostings.id))
    .where(eq(schema.jobApplications.id, applicationId)).limit(1);
  const row = rows[0];
  if (!row) throw notFound('Job application not found');
  if (row.application.worker_account_id === accountId) {
    await workerAccount(accountId);
    return { ...row, participant: 'worker' as const };
  }
  if (row.job.organization_account_id === accountId) {
    await employer(accountId);
    return { ...row, participant: 'employer' as const };
  }
  throw forbidden('Only the applicant and hiring organization can access this conversation');
}

export async function getApplicationMessages(accountId: string, applicationId: string) {
  const { participant } = await applicationParticipant(accountId, applicationId);
  await db.update(schema.jobMessages).set({ read_at: new Date() })
    .where(and(eq(schema.jobMessages.application_id, applicationId), isNull(schema.jobMessages.read_at), sql`${schema.jobMessages.sender_account_id} <> ${accountId}`));
  const rows = await db.select({ message: schema.jobMessages })
    .from(schema.jobMessages).where(eq(schema.jobMessages.application_id, applicationId))
    .orderBy(desc(schema.jobMessages.created_at)).limit(100);
  return rows.reverse().map(({ message }) => ({
    id: message.id, body: message.body, created_at: message.created_at, read_at: message.read_at,
    from_you: message.sender_account_id === accountId,
    sender_role: message.sender_account_id === accountId ? participant : (participant === 'worker' ? 'employer' : 'worker'),
  }));
}

export async function sendApplicationMessage(accountId: string, applicationId: string, dto: any) {
  const { application } = await applicationParticipant(accountId, applicationId);
  if (application.status === 'withdrawn') throw badRequest('This conversation is closed because the application was withdrawn');
  const body = String(dto.body ?? '').trim();
  if (!body || body.length > 5000) throw badRequest('Message must be between 1 and 5000 characters');
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const [recent] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.jobMessages)
    .where(and(eq(schema.jobMessages.sender_account_id, accountId), gte(schema.jobMessages.created_at, since)));
  if ((recent?.count ?? 0) >= 30) throw badRequest('Please wait before sending more messages');
  const [message] = await db.insert(schema.jobMessages).values({ application_id: application.id, sender_account_id: accountId, body }).returning();
  return { id: message.id, body: message.body, created_at: message.created_at, from_you: true };
}

export async function listWorkerInvitations(accountId: string) {
  await workerAccount(accountId);
  const preferences = await getJobPreferences(accountId);
  if (!preferences.job_seeking) return [];
  const now = new Date();
  const rows = await db.select({ invitation: schema.jobInvitations, job: schema.jobPostings, provider: schema.serviceProviders })
    .from(schema.jobInvitations).innerJoin(schema.jobPostings, eq(schema.jobInvitations.job_id, schema.jobPostings.id))
    .innerJoin(schema.serviceProviders, eq(schema.jobPostings.provider_id, schema.serviceProviders.id))
    .where(and(eq(schema.jobInvitations.worker_account_id, accountId), eq(schema.jobInvitations.status, 'pending')))
    .orderBy(desc(schema.jobInvitations.created_at));
  return rows.filter(({ invitation, job }) => invitation.expires_at > now && job.status === 'open' && (!job.closes_at || job.closes_at > now))
    .map(({ invitation, job, provider }) => ({
      id: invitation.id, message: invitation.message, expires_at: invitation.expires_at,
      job_id: job.id, title: job.title, category: job.category, location: job.location,
      employment_type: job.employment_type, description: job.description, organization_name: provider.display_name,
    }));
}

export async function createJobInvitation(accountId: string, jobId: string, dto: any) {
  const { account } = await employer(accountId);
  const job = await db.query.jobPostings.findFirst({ where: (t, { and, eq }) => and(eq(t.id, jobId), eq(t.organization_account_id, account.id)) });
  if (!job || job.status !== 'open' || (job.closes_at && job.closes_at <= new Date())) throw notFound('Open job not found');
  const workerId = String(dto.worker_account_id ?? '');
  const worker = await db.query.accounts.findFirst({ where: (t, { and, eq, isNull }) => and(eq(t.id, workerId), eq(t.status, 'active'), isNull(t.deleted_at)) });
  const profile = worker ? await db.query.careerProfiles.findFirst({ where: (t, { eq }) => eq(t.account_id, workerId) }) : null;
  const person = worker ? await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray, isNull }) => and(eq(t.owner_account_id, workerId), inArray(t.member_type, ['self', 'employee']), isNull(t.deleted_at)) }) : null;
  const ageMs = person ? Date.now() - new Date(person.birthdate).getTime() : 0;
  const excluded = profile?.excluded_employer_account_ids ?? [];
  const categoryMatch = profile?.job_categories?.some((v) => v.toLowerCase().includes(job.category.toLowerCase()) || job.category.toLowerCase().includes(v.toLowerCase()));
  const locationMatch = profile?.job_locations?.some((v) => v.toLowerCase().includes(job.location.toLowerCase()) || job.location.toLowerCase().includes(v.toLowerCase()));
  if (!worker || !['individual', 'user'].includes(worker.role) || !person || ageMs < 18 * 365.2425 * 24 * 60 * 60 * 1000
    || profile?.job_seeking !== true || worker.parent_account_id === account.id || excluded.includes(account.id) || !categoryMatch || !locationMatch) {
    throw forbidden('This person is not currently visible for a matching role and location');
  }
  const message = String(dto.message ?? '').trim().slice(0, 1200) || null;
  const existing = await db.query.jobInvitations.findFirst({ where: (t, { and, eq }) => and(eq(t.job_id, job.id), eq(t.worker_account_id, workerId)) });
  if (existing && ['pending', 'accepted'].includes(existing.status)) throw badRequest('An invitation already exists for this job and person');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  if (existing) {
    const [updated] = await db.update(schema.jobInvitations).set({ message, status: 'pending', expires_at: expiresAt, updated_at: new Date() }).where(eq(schema.jobInvitations.id, existing.id)).returning();
    return updated;
  }
  const [invitation] = await db.insert(schema.jobInvitations).values({ job_id: job.id, worker_account_id: workerId, message, expires_at: expiresAt }).returning();
  return invitation;
}

export async function respondToJobInvitation(accountId: string, invitationId: string, dto: any) {
  await workerAccount(accountId);
  const action = String(dto.action ?? '');
  if (!['accept', 'decline'].includes(action)) throw badRequest('Choose accept or decline');
  const invitation = await db.query.jobInvitations.findFirst({ where: (t, { and, eq }) => and(eq(t.id, invitationId), eq(t.worker_account_id, accountId)) });
  if (!invitation || invitation.status !== 'pending' || invitation.expires_at <= new Date()) throw notFound('This invitation is no longer available');
  if (action === 'decline') {
    const [updated] = await db.update(schema.jobInvitations).set({ status: 'declined', updated_at: new Date() })
      .where(and(eq(schema.jobInvitations.id, invitation.id), eq(schema.jobInvitations.status, 'pending'))).returning();
    if (!updated) throw badRequest('This invitation has already been answered');
    return { status: 'declined' };
  }
  const preferences = await getJobPreferences(accountId);
  const job = await db.query.jobPostings.findFirst({ where: (t, { eq }) => eq(t.id, invitation.job_id) });
  if (!preferences.job_seeking || !job || job.status !== 'open' || (job.closes_at && job.closes_at <= new Date())) throw badRequest('This job or your job-seeking visibility is no longer active');
  const sharedHistoryIds = words(dto.shared_history_ids, 20);
  if (sharedHistoryIds.length) {
    const verified = await db.query.careerHistory.findMany({ where: (t, { and, eq, inArray }) => and(
      eq(t.worker_account_id, accountId), eq(t.verification_status, 'verified'), inArray(t.id, sharedHistoryIds),
    ) });
    if (verified.length !== sharedHistoryIds.length) throw badRequest('You can share only verified work records belonging to you');
  }
  const shareProfile = dto.share_profile === true;
  return db.transaction(async (tx) => {
    const [claimed] = await tx.update(schema.jobInvitations).set({ status: 'accepted', updated_at: new Date() })
      .where(and(eq(schema.jobInvitations.id, invitation.id), eq(schema.jobInvitations.status, 'pending'))).returning();
    if (!claimed) throw badRequest('This invitation has already been answered');
    const previous = await tx.query.jobApplications.findFirst({ where: (t, { and, eq }) => and(eq(t.job_id, job.id), eq(t.worker_account_id, accountId)) });
    if (previous && previous.status !== 'withdrawn') throw badRequest('You already have an active application for this job');
    const [application] = previous
      ? await tx.update(schema.jobApplications).set({ status: 'submitted', shared_profile: shareProfile, shared_history_ids: sharedHistoryIds, cover_note: null, updated_at: new Date() }).where(eq(schema.jobApplications.id, previous.id)).returning()
      : await tx.insert(schema.jobApplications).values({ job_id: job.id, worker_account_id: accountId, status: 'submitted', shared_profile: shareProfile, shared_history_ids: sharedHistoryIds }).returning();
    return { status: 'accepted', application_id: application.id };
  });
}
