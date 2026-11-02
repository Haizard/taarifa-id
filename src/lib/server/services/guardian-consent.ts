import { and, eq } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';

export async function listGuardianMinors(accountId: string) {
  const rows = await db.select({ account: schema.accounts, profile: schema.personProfiles })
    .from(schema.families)
    .innerJoin(schema.familyMembers, eq(schema.familyMembers.family_id, schema.families.id))
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.id, schema.familyMembers.person_profile_id))
    .innerJoin(schema.accounts, eq(schema.accounts.id, schema.personProfiles.owner_account_id))
    .where(and(eq(schema.families.account_id, accountId), eq(schema.familyMembers.member_role, 'underage')));
  return rows.map(({ account, profile }) => ({ id: account.id, display_name: profile.common_name?.trim() || `${profile.first_name} ${profile.last_name}`.trim() }));
}

export async function listMyGuardianConsents(guardianId: string) {
  return db.select().from(schema.serviceGuardianConsents).where(and(eq(schema.serviceGuardianConsents.guardian_account_id, guardianId)));
}

export async function recordGuardianConsent(guardianId: string, requestId: string, dto: any) {
  const minorId = String(dto.minor_account_id ?? '');
  const action = String(dto.action ?? 'consent');
  if (!['consent', 'revoke'].includes(action)) throw badRequest('Choose consent or revoke');
  const [request] = await db.select({ request: schema.serviceRequests, provider: schema.serviceProviders })
    .from(schema.serviceRequests)
    .innerJoin(schema.providerServices, eq(schema.providerServices.id, schema.serviceRequests.provider_service_id))
    .innerJoin(schema.serviceProviders, eq(schema.serviceProviders.id, schema.providerServices.provider_id))
    .where(eq(schema.serviceRequests.id, requestId)).limit(1);
  if (!request || request.request.requester_account_id !== guardianId) throw forbidden('Only the family account that requested this service can manage guardian consent');
  if (request.provider.category !== 'school') throw badRequest('Guardian-approved minor assignments are currently limited to school services');
  if (!['open', 'offered', 'accepted'].includes(request.request.status)) throw badRequest('Guardian consent must be recorded before service work starts');
  const minor = (await listGuardianMinors(guardianId)).find((child) => child.id === minorId);
  if (!minor) throw forbidden('This person is not an underage member of your family account');
  const worker = await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray }) => and(eq(t.owner_account_id, minorId), inArray(t.member_type, ['student', 'underage', 'employee'])) });
  if (!worker) throw badRequest('Only a linked student or underage family account can be assigned to a school service');
  const existing = await db.query.serviceGuardianConsents.findFirst({ where: (t, { and, eq }) => and(eq(t.request_id, requestId), eq(t.minor_account_id, minorId)) });
  if (action === 'revoke') {
    if (!existing || existing.revoked_at) throw notFound('Active guardian consent not found');
    await db.update(schema.serviceGuardianConsents).set({ revoked_at: new Date() }).where(eq(schema.serviceGuardianConsents.id, existing.id));
    return { status: 'revoked' };
  }
  if (existing) {
    await db.update(schema.serviceGuardianConsents).set({ guardian_account_id: guardianId, consented_at: new Date(), revoked_at: null }).where(eq(schema.serviceGuardianConsents.id, existing.id));
    return { status: 'consented' };
  }
  await db.insert(schema.serviceGuardianConsents).values({ request_id: requestId, minor_account_id: minorId, guardian_account_id: guardianId });
  return { status: 'consented' };
}
