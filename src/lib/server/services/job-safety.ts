import { and, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';

export async function hasActiveBlock(accountA: string, accountB: string) {
  const row = await db.query.jobSafetyActions.findFirst({ where: (t, { and, eq, isNull, or }) => and(
    eq(t.action_type, 'block'), isNull(t.unblocked_at), or(
      and(eq(t.reporter_account_id, accountA), eq(t.subject_account_id, accountB)),
      and(eq(t.reporter_account_id, accountB), eq(t.subject_account_id, accountA)),
    ),
  ) });
  return !!row;
}

function sameBlockedPairs(rows: { reporter_account_id: string; subject_account_id: string | null }[], accountId: string) {
  return new Set(rows.map(({ reporter_account_id, subject_account_id }) => reporter_account_id === accountId ? subject_account_id : reporter_account_id).filter((id): id is string => !!id));
}

export async function blockedCounterpartIds(accountId: string) {
  const rows = await db.select({ reporter_account_id: schema.jobSafetyActions.reporter_account_id, subject_account_id: schema.jobSafetyActions.subject_account_id })
    .from(schema.jobSafetyActions).where(and(
      eq(schema.jobSafetyActions.action_type, 'block'), isNull(schema.jobSafetyActions.unblocked_at),
      or(eq(schema.jobSafetyActions.reporter_account_id, accountId), eq(schema.jobSafetyActions.subject_account_id, accountId)),
    ));
  return sameBlockedPairs(rows, accountId);
}

async function participantApplication(accountId: string, applicationId: string) {
  const rows = await db.select({ application: schema.jobApplications, job: schema.jobPostings })
    .from(schema.jobApplications).innerJoin(schema.jobPostings, eq(schema.jobApplications.job_id, schema.jobPostings.id))
    .where(eq(schema.jobApplications.id, applicationId)).limit(1);
  const row = rows[0];
  if (!row) throw notFound('Job application not found');
  if (row.application.worker_account_id !== accountId && row.job.organization_account_id !== accountId) throw forbidden('Only the applicant and hiring organization can report or block participants');
  if (await hasActiveBlock(row.application.worker_account_id, row.job.organization_account_id)) throw forbidden('This application is unavailable because one participant blocked the other');
  const actor = await db.query.accounts.findFirst({ where: (t, { eq, isNull, and }) => and(eq(t.id, accountId), isNull(t.deleted_at)) });
  const employerActor = row.job.organization_account_id === accountId && actor?.status === 'active' && actor.role === 'admin' && ['business', 'school', 'institution'].includes(actor.account_type);
  const workerActor = row.application.worker_account_id === accountId && actor?.status === 'active' && ['individual', 'user'].includes(actor.role);
  if (!employerActor && !workerActor) throw forbidden('This account cannot report or block job participants');
  return { application: row.application, job: row.job, subjectId: workerActor ? row.job.organization_account_id : row.application.worker_account_id };
}

export async function reportOrBlock(accountId: string, dto: any) {
  const action = String(dto.action_type ?? '');
  if (!['report', 'block'].includes(action)) throw badRequest('Choose report or block');
  const reason = String(dto.reason ?? '').trim().slice(0, 80);
  if (!reason) throw badRequest('Choose a reason');
  const details = String(dto.details ?? '').trim().slice(0, 2000) || null;
  let jobId: string | null = null;
  let applicationId: string | null = null;
  let messageId: string | null = null;
  let subjectId: string;
  if (dto.job_id) {
    const actor = await db.query.accounts.findFirst({ where: (t, { eq, isNull, and }) => and(eq(t.id, accountId), isNull(t.deleted_at)) });
    if (!actor || actor.status !== 'active' || !['individual', 'user'].includes(actor.role)) throw forbidden('Only an active worker can report or block an organization from a job listing');
    const job = await db.query.jobPostings.findFirst({ where: (t, { eq }) => eq(t.id, String(dto.job_id)) });
    if (!job) throw notFound('Job not found');
    subjectId = job.organization_account_id;
    jobId = job.id;
  } else if (dto.application_id) {
    const context = await participantApplication(accountId, String(dto.application_id));
    subjectId = context.subjectId;
    jobId = context.job.id;
    applicationId = context.application.id;
    if (dto.message_id) {
      const message = await db.query.jobMessages.findFirst({ where: (t, { and, eq }) => and(eq(t.id, String(dto.message_id)), eq(t.application_id, applicationId!)) });
      if (!message) throw notFound('Reported message not found in this conversation');
      messageId = message.id;
    }
  } else {
    throw badRequest('Include a job or application to report');
  }
  if (action === 'block') {
    const existing = await db.query.jobSafetyActions.findFirst({ where: (t, { and, eq, isNull }) => and(
      eq(t.action_type, 'block'), eq(t.reporter_account_id, accountId), eq(t.subject_account_id, subjectId), isNull(t.unblocked_at),
    ) });
    if (existing) return { id: existing.id, action_type: 'block', status: 'active' };
  } else {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recent] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.jobSafetyActions)
      .where(and(eq(schema.jobSafetyActions.action_type, 'report'), eq(schema.jobSafetyActions.reporter_account_id, accountId), gte(schema.jobSafetyActions.created_at, since)));
    if ((recent?.count ?? 0) >= 10) throw badRequest('Report limit reached. Try again later.');
  }
  const [created] = await db.insert(schema.jobSafetyActions).values({
    action_type: action, reporter_account_id: accountId, subject_account_id: subjectId,
    job_id: jobId, application_id: applicationId, message_id: messageId, reason, details,
  }).returning();
  if (action === 'block') {
    const job = jobId ? await db.query.jobPostings.findFirst({ where: (t, { eq }) => eq(t.id, jobId) }) : null;
    if (job) {
      const workerId = job.organization_account_id === accountId ? subjectId : accountId;
      await db.update(schema.jobApplications).set({ shared_profile: false, shared_history_ids: [], updated_at: new Date() })
        .where(and(eq(schema.jobApplications.worker_account_id, workerId), inArray(schema.jobApplications.job_id,
          db.select({ id: schema.jobPostings.id }).from(schema.jobPostings).where(eq(schema.jobPostings.organization_account_id, job.organization_account_id)),
        )));
      await db.update(schema.jobInvitations).set({ status: 'expired', updated_at: new Date() })
        .where(and(eq(schema.jobInvitations.worker_account_id, workerId), inArray(schema.jobInvitations.job_id,
          db.select({ id: schema.jobPostings.id }).from(schema.jobPostings).where(eq(schema.jobPostings.organization_account_id, job.organization_account_id)),
        )));
    }
  }
  return { id: created.id, action_type: action, status: action === 'block' ? 'active' : created.status };
}

export async function listMyBlocks(accountId: string) {
  const rows = await db.select({ action: schema.jobSafetyActions, subject: schema.accounts, provider: schema.serviceProviders })
    .from(schema.jobSafetyActions).innerJoin(schema.accounts, eq(schema.jobSafetyActions.subject_account_id, schema.accounts.id))
    .leftJoin(schema.serviceProviders, eq(schema.serviceProviders.account_id, schema.accounts.id))
    .where(and(eq(schema.jobSafetyActions.action_type, 'block'), eq(schema.jobSafetyActions.reporter_account_id, accountId), isNull(schema.jobSafetyActions.unblocked_at)))
    .orderBy(desc(schema.jobSafetyActions.created_at));
  return rows.map(({ action, subject, provider }) => ({ id: action.id, subject_account_id: subject.id, name: provider?.display_name ?? subject.username, created_at: action.created_at }));
}

export async function unblock(accountId: string, blockId: string) {
  const [updated] = await db.update(schema.jobSafetyActions).set({ unblocked_at: new Date() })
    .where(and(eq(schema.jobSafetyActions.id, blockId), eq(schema.jobSafetyActions.action_type, 'block'), eq(schema.jobSafetyActions.reporter_account_id, accountId), isNull(schema.jobSafetyActions.unblocked_at))).returning();
  if (!updated) throw notFound('Active block not found');
  return { message: 'Account unblocked' };
}

export async function listOpenReports() {
  const reporterAccount = alias(schema.accounts, 'job_reporter');
  const subjectAccount = alias(schema.accounts, 'job_subject');
  const rows = await db.select({ action: schema.jobSafetyActions, reporter: reporterAccount, subject: subjectAccount, job: schema.jobPostings, message: schema.jobMessages })
    .from(schema.jobSafetyActions)
    .innerJoin(reporterAccount, eq(schema.jobSafetyActions.reporter_account_id, reporterAccount.id))
    .leftJoin(subjectAccount, eq(schema.jobSafetyActions.subject_account_id, subjectAccount.id))
    .leftJoin(schema.jobPostings, eq(schema.jobSafetyActions.job_id, schema.jobPostings.id))
    .leftJoin(schema.jobMessages, eq(schema.jobSafetyActions.message_id, schema.jobMessages.id))
    .where(and(eq(schema.jobSafetyActions.action_type, 'report'), eq(schema.jobSafetyActions.status, 'open')))
    .orderBy(desc(schema.jobSafetyActions.created_at));
  return rows.map(({ action, reporter, subject, job, message }) => ({
    id: action.id, reason: action.reason, details: action.details, created_at: action.created_at,
    reporter_username: reporter.username, subject_username: subject?.username ?? null,
    job_title: job?.title ?? null, reported_message: message?.body ?? null,
  }));
}

export async function resolveReport(adminId: string, reportId: string, dto: any) {
  const outcome = String(dto.outcome ?? '');
  if (!['resolved', 'dismissed'].includes(outcome)) throw badRequest('Choose resolved or dismissed');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (note.length < 4) throw badRequest('Add a resolution note');
  return db.transaction(async (tx) => {
    const [report] = await tx.update(schema.jobSafetyActions).set({
      status: outcome, resolution_note: note, resolved_by_account_id: adminId, resolved_at: new Date(),
    }).where(and(eq(schema.jobSafetyActions.id, reportId), eq(schema.jobSafetyActions.action_type, 'report'), eq(schema.jobSafetyActions.status, 'open'))).returning();
    if (!report) throw notFound('Open report not found');
    await tx.insert(schema.systemAdminLogs).values({ actor_account_id: adminId, action: 'job_safety_report_reviewed', target_account_id: report.subject_account_id, payload: { report_id: report.id, outcome, reason: report.reason, note } });
    return { id: report.id, status: report.status };
  });
}
