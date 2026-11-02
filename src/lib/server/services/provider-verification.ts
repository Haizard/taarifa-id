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
  const request = await db.query.providerVerificationRequests.findFirst({
    where: (t, { eq }) => eq(t.provider_id, provider.id), orderBy: (t, { desc }) => [desc(t.created_at)],
  });
  return { status: provider.verification_status, verified_at: provider.verified_at, request: request ?? null };
}

export async function submitVerification(accountId: string, dto: any) {
  const provider = await ownProvider(accountId);
  if (provider.verification_status === 'verified') throw badRequest('This provider is already verified');
  const legalName = String(dto.legal_name ?? '').trim().slice(0, 200);
  const registrationReference = String(dto.registration_reference ?? '').trim().slice(0, 120);
  const evidenceNotes = String(dto.evidence_notes ?? '').trim().slice(0, 3000) || null;
  if (legalName.length < 3 || registrationReference.length < 3) throw badRequest('Enter the registered organization name and registration or licence reference');
  const pending = await db.query.providerVerificationRequests.findFirst({ where: (t, { and, eq }) => and(eq(t.provider_id, provider.id), eq(t.status, 'pending')) });
  if (pending) throw badRequest('A verification request is already awaiting review');
  return db.transaction(async (tx) => {
    const [request] = await tx.insert(schema.providerVerificationRequests).values({
      provider_id: provider.id, submitted_by_account_id: accountId, legal_name: legalName,
      registration_reference: registrationReference, evidence_notes: evidenceNotes,
    }).returning();
    await tx.update(schema.serviceProviders).set({ verification_status: 'pending', updated_at: new Date() }).where(eq(schema.serviceProviders.id, provider.id));
    return request;
  });
}

export async function listPendingVerificationRequests() {
  const rows = await db.select({ request: schema.providerVerificationRequests, provider: schema.serviceProviders, account: schema.accounts })
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

export async function reviewVerificationRequest(adminId: string, requestId: string, dto: any) {
  const outcome = String(dto.outcome ?? '');
  if (!['approved', 'rejected'].includes(outcome)) throw badRequest('Choose approve or reject');
  const note = String(dto.note ?? '').trim().slice(0, 2000);
  if (note.length < 4) throw badRequest('Add a review note for the organization');
  return db.transaction(async (tx) => {
    const [request] = await tx.update(schema.providerVerificationRequests).set({
      status: outcome, review_note: note, reviewed_by_account_id: adminId, reviewed_at: new Date(), updated_at: new Date(),
    }).where(and(eq(schema.providerVerificationRequests.id, requestId), eq(schema.providerVerificationRequests.status, 'pending'))).returning();
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
