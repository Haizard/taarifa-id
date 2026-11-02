import { and, desc, eq } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';

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
  return { status: provider.verification_status, verified_at: provider.verified_at, request: request ?? null };
}

export async function submitVerification(accountId: string, dto: any) {
  const provider = await ownProvider(accountId);
  if (provider.verification_status === 'verified') throw badRequest('This provider is already verified');
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
  return db.transaction(async (tx) => {
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
  return db.transaction(async (tx) => {
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
}
