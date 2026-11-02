import { and, desc, eq } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';
import { notifyAccount } from './notifications';

const VERIFICATION_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;
export function isProviderVerificationCurrent(provider: { verification_status: string; verified_at: Date | null }) {
  return provider.verification_status === 'verified' && !!provider.verified_at && Date.now() < new Date(provider.verified_at).getTime() + VERIFICATION_VALIDITY_MS;
}

async function ownProvider(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { and, eq, isNull }) => and(eq(t.id, accountId), isNull(t.deleted_at)) });
  if (!account || account.role !== 'admin' || !['business', 'school', 'institution'].includes(account.account_type)) throw forbidden('Only organization admins can submit verification');
  const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
  if (!provider) throw badRequest('Create your provider profile before requesting verification');
  return provider;
}

export async function getOwnVerification(accountId: string) {
  const provider = await ownProvider(accountId);
  const [request] = await db.select({
    id: schema.providerVerificationRequests.id,
    legal_name: schema.providerVerificationRequests.legal_name,
    registration_reference: schema.providerVerificationRequests.registration_reference,
    evidence_notes: schema.providerVerificationRequests.evidence_notes,
    evidence_file_name: schema.providerVerificationRequests.evidence_file_name,
    evidence_size_bytes: schema.providerVerificationRequests.evidence_size_bytes,
    status: schema.providerVerificationRequests.status,
    review_note: schema.providerVerificationRequests.review_note,
    created_at: schema.providerVerificationRequests.created_at,
  }).from(schema.providerVerificationRequests).where(eq(schema.providerVerificationRequests.provider_id, provider.id))
    .orderBy(desc(schema.providerVerificationRequests.created_at)).limit(1);
  const expiresAt = provider.verified_at ? new Date(new Date(provider.verified_at).getTime() + VERIFICATION_VALIDITY_MS) : null;
  const renewalDue = provider.verification_status === 'verified' && !!expiresAt && expiresAt <= new Date();
  if (renewalDue && provider.verified_at) await notifyAccount(accountId, `verification-renewal:${provider.id}:${provider.verified_at.getTime()}`, 'verification', 'Provider verification renewal due', 'Your annual verification has expired. Submit updated registration evidence to restore employer features.', '/dashboard/provider');
  const appeal = request?.status === 'rejected' ? await db.query.providerVerificationAppeals.findFirst({ where: (t, { eq }) => eq(t.request_id, request.id) }) : null;
  return { status: renewalDue ? 'renewal_due' : provider.verification_status, verified_at: provider.verified_at, expires_at: expiresAt, renewal_due: renewalDue, request: request ?? null, appeal: appeal ?? null };
}

export async function submitVerification(accountId: string, dto: any) {
  const provider = await ownProvider(accountId);
  if (provider.verification_status === 'verified' && isProviderVerificationCurrent(provider)) throw badRequest('This provider is already verified');
  const lastRejected = await db.query.providerVerificationRequests.findFirst({ where: (t, { and, eq }) => and(eq(t.provider_id, provider.id), eq(t.status, 'rejected')), orderBy: (t, { desc }) => [desc(t.created_at)] });
  if (lastRejected) {
    const pendingAppeal = await db.query.providerVerificationAppeals.findFirst({ where: (t, { and, eq }) => and(eq(t.request_id, lastRejected.id), eq(t.status, 'pending')) });
    if (pendingAppeal) throw badRequest('Wait for the pending reconsideration decision before submitting another verification request');
  }
  const legalName = String(dto.legal_name ?? '').trim().slice(0, 200);
  const registrationReference = String(dto.registration_reference ?? '').trim().slice(0, 120);
  const evidenceNotes = String(dto.evidence_notes ?? '').trim().slice(0, 3000) || null;
  if (legalName.length < 3 || registrationReference.length < 3) throw badRequest('Enter the registered organization name and registration or licence reference');
  const fileName = String(dto.evidence_file_name ?? '').trim().replace(/[\\/\0-\x1f]/g, '_').slice(0, 255);
  const mimeType = String(dto.evidence_mime_type ?? '').trim().toLowerCase();
  const encoded = String(dto.evidence_base64 ?? '').trim();
  if (!fileName || !['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType) || !encoded || encoded.length > 2_800_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw badRequest('Upload one PDF, JPEG, or PNG registration document up to 2 MB');
  }
  const evidenceDocument = Buffer.from(encoded, 'base64');
  if (!evidenceDocument.length || evidenceDocument.length > 2 * 1024 * 1024) throw badRequest('The evidence document must not exceed 2 MB');
  const signatureMatches = mimeType === 'application/pdf'
    ? evidenceDocument.subarray(0, 5).toString('ascii') === '%PDF-'
    : mimeType === 'image/png'
      ? evidenceDocument.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : evidenceDocument[0] === 0xff && evidenceDocument[1] === 0xd8 && evidenceDocument[2] === 0xff;
  if (!signatureMatches) throw badRequest('The document content does not match its file type');
  const pending = await db.query.providerVerificationRequests.findFirst({ where: (t, { and, eq }) => and(eq(t.provider_id, provider.id), eq(t.status, 'pending')) });
  if (pending) throw badRequest('A verification request is already awaiting review');
  const result = await db.transaction(async (tx) => {
    const [request] = await tx.insert(schema.providerVerificationRequests).values({
      provider_id: provider.id, submitted_by_account_id: accountId, legal_name: legalName,
      registration_reference: registrationReference, evidence_notes: evidenceNotes,
      evidence_file_name: fileName, evidence_mime_type: mimeType, evidence_size_bytes: evidenceDocument.length,
      evidence_document: evidenceDocument,
    }).returning();
    await tx.update(schema.serviceProviders).set({ verification_status: 'pending', updated_at: new Date() }).where(eq(schema.serviceProviders.id, provider.id));
    const { evidence_document: _privateDocument, ...safeRequest } = request;
    return safeRequest;
  });
  const admins = await db.query.accounts.findMany({ where: (t, { eq, isNull, and }) => and(eq(t.role, 'system_admin'), isNull(t.deleted_at)) });
  for (const admin of admins) await notifyAccount(admin.id, `verification-submission:${result.id}:${admin.id}`, 'verification', 'Provider verification submitted', 'An organization submitted registration evidence for review.', '/admin/provider-verification');
  return result;
}

export async function submitVerificationAppeal(accountId: string, dto: any) {
  const provider = await ownProvider(accountId);
  const requestId = String(dto.request_id ?? '');
  const request = await db.query.providerVerificationRequests.findFirst({ where: (t, { and, eq }) => and(eq(t.id, requestId), eq(t.provider_id, provider.id), eq(t.status, 'rejected')) });
  if (!request) throw notFound('Rejected verification request not found');
  const appealNote = String(dto.appeal_note ?? '').trim().slice(0, 3000);
  if (appealNote.length < 20) throw badRequest('Explain why the decision should be reconsidered (at least 20 characters)');
  const prior = await db.query.providerVerificationAppeals.findFirst({ where: (t, { eq }) => eq(t.request_id, request.id) });
  if (prior) throw badRequest('A reconsideration request was already submitted for this decision');
  const [appeal] = await db.insert(schema.providerVerificationAppeals).values({ request_id: request.id, provider_id: provider.id, submitted_by_account_id: accountId, appeal_note: appealNote }).returning();
  const admins = await db.query.accounts.findMany({ where: (t, { eq, isNull, and }) => and(eq(t.role, 'system_admin'), isNull(t.deleted_at)) });
  for (const admin of admins) await notifyAccount(admin.id, `verification-appeal-submitted:${appeal.id}:${admin.id}`, 'verification', 'Provider reconsideration requested', 'An organization asked the platform to reconsider a verification decision.', '/admin/provider-verification');
  return { id: appeal.id, status: appeal.status };
}

export async function listPendingVerificationAppeals() {
  const rows = await db.select({ appeal: schema.providerVerificationAppeals, request: schema.providerVerificationRequests, provider: schema.serviceProviders, account: schema.accounts })
    .from(schema.providerVerificationAppeals)
    .innerJoin(schema.providerVerificationRequests, eq(schema.providerVerificationAppeals.request_id, schema.providerVerificationRequests.id))
    .innerJoin(schema.serviceProviders, eq(schema.providerVerificationAppeals.provider_id, schema.serviceProviders.id))
    .innerJoin(schema.accounts, eq(schema.serviceProviders.account_id, schema.accounts.id))
    .where(eq(schema.providerVerificationAppeals.status, 'pending')).orderBy(desc(schema.providerVerificationAppeals.created_at));
  return rows.map(({ appeal, request, provider, account }) => ({ ...appeal, request_id: request.id, provider_name: provider.display_name, username: account.username, legal_name: request.legal_name, registration_reference: request.registration_reference, evidence_file_name: request.evidence_file_name }));
}

export async function reviewVerificationAppeal(adminId: string, appealId: string, dto: any) {
  const outcome = String(dto.outcome ?? '');
  if (!['approved', 'rejected'].includes(outcome)) throw badRequest('Choose approve or reject');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (note.length < 4) throw badRequest('Add a review note for the organization');
  const result = await db.transaction(async (tx) => {
    const [appeal] = await tx.update(schema.providerVerificationAppeals).set({ status: outcome, decision_note: note, reviewed_by_account_id: adminId, reviewed_at: new Date(), updated_at: new Date() })
      .where(and(eq(schema.providerVerificationAppeals.id, appealId), eq(schema.providerVerificationAppeals.status, 'pending')))
      .returning({ id: schema.providerVerificationAppeals.id, request_id: schema.providerVerificationAppeals.request_id, provider_id: schema.providerVerificationAppeals.provider_id, submitted_by_account_id: schema.providerVerificationAppeals.submitted_by_account_id });
    if (!appeal) throw notFound('Pending reconsideration request not found');
    if (outcome === 'approved') {
      await tx.update(schema.providerVerificationRequests).set({ status: 'approved', review_note: note, reviewed_by_account_id: adminId, reviewed_at: new Date(), updated_at: new Date() }).where(eq(schema.providerVerificationRequests.id, appeal.request_id));
      await tx.update(schema.serviceProviders).set({ verification_status: 'verified', verified_by_account_id: adminId, verified_at: new Date(), updated_at: new Date() }).where(eq(schema.serviceProviders.id, appeal.provider_id));
    }
    await tx.insert(schema.systemAdminLogs).values({ actor_account_id: adminId, action: 'provider_verification_appeal_reviewed', target_account_id: appeal.submitted_by_account_id, payload: { appeal_id: appeal.id, request_id: appeal.request_id, outcome, note } });
    return { id: appeal.id, status: outcome };
  });
  const appeal = await db.query.providerVerificationAppeals.findFirst({ where: (t, { eq }) => eq(t.id, appealId) });
  if (appeal) await notifyAccount(appeal.submitted_by_account_id, `verification-appeal-decision:${appeal.id}`, 'verification', `Reconsideration ${outcome}`, `The platform ${outcome === 'approved' ? 'approved' : 'rejected'} your request to reconsider the verification decision.`, '/dashboard/provider');
  return result;
}

export async function listPendingVerificationRequests() {
  const rows = await db.select({
    request: {
      id: schema.providerVerificationRequests.id,
      provider_id: schema.providerVerificationRequests.provider_id,
      submitted_by_account_id: schema.providerVerificationRequests.submitted_by_account_id,
      legal_name: schema.providerVerificationRequests.legal_name,
      registration_reference: schema.providerVerificationRequests.registration_reference,
      evidence_notes: schema.providerVerificationRequests.evidence_notes,
      evidence_file_name: schema.providerVerificationRequests.evidence_file_name,
      evidence_mime_type: schema.providerVerificationRequests.evidence_mime_type,
      evidence_size_bytes: schema.providerVerificationRequests.evidence_size_bytes,
      status: schema.providerVerificationRequests.status,
      review_note: schema.providerVerificationRequests.review_note,
      reviewed_by_account_id: schema.providerVerificationRequests.reviewed_by_account_id,
      reviewed_at: schema.providerVerificationRequests.reviewed_at,
      created_at: schema.providerVerificationRequests.created_at,
      updated_at: schema.providerVerificationRequests.updated_at,
    }, provider: schema.serviceProviders, account: schema.accounts,
  })
    .from(schema.providerVerificationRequests)
    .innerJoin(schema.serviceProviders, eq(schema.providerVerificationRequests.provider_id, schema.serviceProviders.id))
    .innerJoin(schema.accounts, eq(schema.serviceProviders.account_id, schema.accounts.id))
    .where(eq(schema.providerVerificationRequests.status, 'pending'))
    .orderBy(desc(schema.providerVerificationRequests.created_at));
  return rows.map(({ request, provider, account }) => ({
      ...request, provider_name: provider.display_name, provider_category: provider.category,
      organization_type: account.account_type, username: account.username, region: provider.region,
    }));
}

export async function getVerificationEvidence(_adminId: string, requestId: string) {
  const [request] = await db.select({
    evidence_document: schema.providerVerificationRequests.evidence_document,
    evidence_file_name: schema.providerVerificationRequests.evidence_file_name,
    evidence_mime_type: schema.providerVerificationRequests.evidence_mime_type,
  }).from(schema.providerVerificationRequests).where(eq(schema.providerVerificationRequests.id, requestId)).limit(1);
  if (!request?.evidence_document || !request.evidence_file_name || !request.evidence_mime_type) throw notFound('Verification evidence not found');
  return {
    file_name: request.evidence_file_name,
    mime_type: request.evidence_mime_type,
    base64: Buffer.from(request.evidence_document).toString('base64'),
  };
}

export async function reviewVerificationRequest(adminId: string, requestId: string, dto: any) {
  const outcome = String(dto.outcome ?? '');
  if (!['approved', 'rejected'].includes(outcome)) throw badRequest('Choose approve or reject');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (note.length < 4) throw badRequest('Add a review note for the organization');
  const result = await db.transaction(async (tx) => {
    const [request] = await tx.update(schema.providerVerificationRequests).set({
      status: outcome, review_note: note, reviewed_by_account_id: adminId, reviewed_at: new Date(), updated_at: new Date(),
    }).where(and(eq(schema.providerVerificationRequests.id, requestId), eq(schema.providerVerificationRequests.status, 'pending')))
      .returning({ id: schema.providerVerificationRequests.id, provider_id: schema.providerVerificationRequests.provider_id, submitted_by_account_id: schema.providerVerificationRequests.submitted_by_account_id });
    if (!request) throw notFound('Pending verification request not found');
    await tx.update(schema.serviceProviders).set({
      verification_status: outcome === 'approved' ? 'verified' : 'rejected',
      verified_by_account_id: outcome === 'approved' ? adminId : null,
      verified_at: outcome === 'approved' ? new Date() : null,
      updated_at: new Date(),
    }).where(eq(schema.serviceProviders.id, request.provider_id));
    await tx.insert(schema.systemAdminLogs).values({
      actor_account_id: adminId, action: 'provider_verification_reviewed',
      target_account_id: request.submitted_by_account_id,
      payload: { request_id: request.id, provider_id: request.provider_id, outcome, note },
    });
    return { id: request.id, status: outcome };
  });
  const request = await db.query.providerVerificationRequests.findFirst({ where: (t, { eq }) => eq(t.id, requestId) });
  if (request) await notifyAccount(request.submitted_by_account_id, `verification-decision:${request.id}`, 'verification', `Provider verification ${outcome}`, `The platform ${outcome === 'approved' ? 'approved' : 'rejected'} your registration review. ${note}`, '/dashboard/provider');
  return result;
}
