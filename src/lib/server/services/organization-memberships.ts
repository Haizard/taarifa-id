import { and, eq, isNull, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';
import { notifyAccount } from './notifications';

const organizationTypes = ['business', 'school', 'institution'];

async function requireOrganizationAdmin(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { and, eq, isNull }) => and(eq(t.id, accountId), isNull(t.deleted_at)) });
  if (!account || account.role !== 'admin' || !organizationTypes.includes(account.account_type)) throw forbidden('Only organization administrators can manage workforce invitations');
  return account;
}

export async function listOrganizationMemberships(accountId: string) {
  await requireOrganizationAdmin(accountId);
  const rows = await db.select({ membership: schema.organizationMemberships, worker: schema.accounts, profile: schema.personProfiles })
    .from(schema.organizationMemberships)
    .innerJoin(schema.accounts, eq(schema.organizationMemberships.worker_account_id, schema.accounts.id))
    .leftJoin(schema.personProfiles, and(eq(schema.personProfiles.owner_account_id, schema.accounts.id), isNull(schema.personProfiles.deleted_at)))
    .where(eq(schema.organizationMemberships.organization_account_id, accountId))
    .orderBy(schema.organizationMemberships.created_at);
  return rows.map(({ membership, worker, profile }) => ({
    ...membership,
    username: worker.username,
    display_name: profile?.common_name?.trim() || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || worker.username,
  }));
}

export async function inviteOrganizationWorker(accountId: string, dto: any) {
  const organization = await requireOrganizationAdmin(accountId);
  const username = String(dto.username ?? '').trim();
  if (!username) throw badRequest('Enter the worker’s existing username');
  const worker = await db.query.accounts.findFirst({ where: (t, { and, eq, isNull, ne }) => and(eq(t.username, username), ne(t.id, accountId), isNull(t.deleted_at)) });
  if (!worker || !['individual', 'user'].includes(worker.role) || worker.status !== 'active') throw notFound('No active individual account was found for that username');
  const profile = await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray, isNull }) => and(eq(t.owner_account_id, worker.id), inArray(t.member_type, ['self', 'adult', 'employee', 'student', 'underage']), isNull(t.deleted_at)) });
  if (!profile) throw badRequest('This account needs an active person profile before it can be invited');
  const isMinor = Date.now() - new Date(profile.birthdate).getTime() < 18 * 365.2425 * 24 * 60 * 60 * 1000;
  let guardianAccountIds: string[] = [];
  if (isMinor) {
    const guardian = await db.select({ account_id: schema.families.account_id }).from(schema.familyMembers)
      .innerJoin(schema.families, eq(schema.families.id, schema.familyMembers.family_id))
      .where(and(eq(schema.familyMembers.person_profile_id, profile.id), eq(schema.familyMembers.member_role, 'underage'))).limit(1);
    if (organization.account_type !== 'school' || !guardian.length) throw badRequest('Minors may only be invited to a school roster when a family guardian account is linked');
    guardianAccountIds = guardian.map((row) => row.account_id);
  }
  const existing = await db.query.organizationMemberships.findFirst({ where: (t, { and, eq }) => and(eq(t.organization_account_id, accountId), eq(t.worker_account_id, worker.id)) });
  if (existing && ['active', 'invited'].includes(existing.status)) throw badRequest(existing.status === 'active' ? 'This worker is already on your roster' : 'An invitation is already pending for this worker');
  const [membership] = await db.insert(schema.organizationMemberships).values({
    organization_account_id: accountId,
    worker_account_id: worker.id,
    invited_by_account_id: accountId,
    status: 'invited',
  }).onConflictDoUpdate({
    target: [schema.organizationMemberships.organization_account_id, schema.organizationMemberships.worker_account_id],
    set: { status: 'invited', invited_by_account_id: accountId, responded_at: null, ended_at: null, updated_at: new Date() },
  }).returning();
  const orgName = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  const workerName = profile.common_name?.trim() || `${profile.first_name} ${profile.last_name}`.trim();
  if (isMinor) for (const guardianId of guardianAccountIds) await notifyAccount(guardianId, `org-invite-guardian:${membership.id}:${guardianId}`, 'organization', 'School membership needs your review', `${orgName?.display_name ?? organization.username} invited ${workerName} to its school roster. Review and accept or decline the link.`, '/dashboard/requests');
  else await notifyAccount(worker.id, `org-invite:${membership.id}`, 'organization', 'Organization invitation', `${orgName?.display_name ?? organization.username} invited you to join its workforce.`, '/dashboard/career');
  return { id: membership.id, status: membership.status, username: worker.username };
}

export async function listMyOrganizationInvitations(accountId: string) {
  const rows = await db.select({ membership: schema.organizationMemberships, organization: schema.accounts, provider: schema.serviceProviders })
    .from(schema.organizationMemberships)
    .innerJoin(schema.accounts, eq(schema.organizationMemberships.organization_account_id, schema.accounts.id))
    .leftJoin(schema.serviceProviders, eq(schema.serviceProviders.account_id, schema.accounts.id))
    .where(and(eq(schema.organizationMemberships.worker_account_id, accountId), eq(schema.organizationMemberships.status, 'invited')));
  return rows.map(({ membership, organization, provider }) => ({
    id: membership.id,
    organization_account_id: organization.id,
    organization_name: provider?.display_name ?? organization.username,
    organization_type: organization.account_type,
    invited_at: membership.created_at,
  }));
}

export async function listMyOrganizationMemberships(accountId: string) {
  const rows = await db.select({ membership: schema.organizationMemberships, organization: schema.accounts, provider: schema.serviceProviders })
    .from(schema.organizationMemberships)
    .innerJoin(schema.accounts, eq(schema.organizationMemberships.organization_account_id, schema.accounts.id))
    .leftJoin(schema.serviceProviders, eq(schema.serviceProviders.account_id, schema.accounts.id))
    .where(and(eq(schema.organizationMemberships.worker_account_id, accountId), inArray(schema.organizationMemberships.status, ['active', 'suspended'])));
  return rows.map(({ membership, organization, provider }) => ({ id: membership.id, organization_name: provider?.display_name ?? organization.username, organization_type: organization.account_type, status: membership.status }));
}

export async function leaveOrganizationMembership(accountId: string, membershipId: string) {
  const membership = await db.query.organizationMemberships.findFirst({ where: (t, { and, eq }) => and(eq(t.id, membershipId), eq(t.worker_account_id, accountId), eq(t.status, 'active')) });
  if (!membership) throw notFound('Active organization link not found');
  const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, membership.organization_account_id) });
  const activeJobs = provider ? await db.select({ id: schema.serviceAssignments.id }).from(schema.serviceAssignments)
    .innerJoin(schema.serviceRequests, eq(schema.serviceAssignments.request_id, schema.serviceRequests.id))
    .where(and(eq(schema.serviceAssignments.worker_account_id, accountId), eq(schema.serviceAssignments.provider_id, provider.id), eq(schema.serviceAssignments.status, 'active'), inArray(schema.serviceRequests.status, ['accepted', 'in_progress']))) : [];
  if (activeJobs.length) throw badRequest('Complete or have this organization reassign your active service work before leaving');
  await db.update(schema.organizationMemberships).set({ status: 'ended', ended_at: new Date(), updated_at: new Date() }).where(eq(schema.organizationMemberships.id, membership.id));
  const remaining = await db.query.organizationMemberships.findFirst({ where: (t, { and, eq }) => and(eq(t.worker_account_id, accountId), eq(t.status, 'active')) });
  const worker = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  const organization = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, membership.organization_account_id) });
  const profile = await db.query.personProfiles.findFirst({ where: (t, { eq }) => eq(t.owner_account_id, accountId) });
  if (profile && organization) {
    if (organization.account_type === 'business') {
      const entity = await db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, organization.id) });
      if (entity) await db.delete(schema.businessMembers).where(and(eq(schema.businessMembers.business_id, entity.id), eq(schema.businessMembers.person_profile_id, profile.id)));
    } else if (organization.account_type === 'school') {
      const entity = await db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, organization.id) });
      if (entity) await db.delete(schema.schoolMembers).where(and(eq(schema.schoolMembers.school_id, entity.id), eq(schema.schoolMembers.person_profile_id, profile.id)));
    } else if (organization.account_type === 'institution') {
      const entity = await db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, organization.id) });
      if (entity) await db.delete(schema.institutionMembers).where(and(eq(schema.institutionMembers.institution_id, entity.id), eq(schema.institutionMembers.person_profile_id, profile.id)));
    }
  }
  if (worker?.parent_account_id === membership.organization_account_id) {
    await db.update(schema.accounts).set(remaining
      ? { parent_account_id: remaining.organization_account_id, account_type: (await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, remaining.organization_account_id) }))?.account_type ?? 'individual', updated_at: new Date() }
      : { account_type: 'individual', role: 'individual', parent_account_id: null, is_reseller: false, updated_at: new Date() })
      .where(eq(schema.accounts.id, accountId));
  } else if (!remaining && !worker?.parent_account_id && worker?.role === 'user') {
    await db.update(schema.accounts).set({ account_type: 'individual', role: 'individual', parent_account_id: null, is_reseller: false, updated_at: new Date() }).where(eq(schema.accounts.id, accountId));
  }
  await notifyAccount(accountId, `org-membership-left:${membership.id}`, 'organization', 'Organization link ended', 'Your organization link ended. Your account and work history remain yours.', '/dashboard/career');
  return { message: 'Organization link ended. Your account and work history remain available.' };
}

export async function respondToOrganizationInvitation(accountId: string, membershipId: string, dto: any) {
  const action = String(dto.action ?? '');
  if (!['accept', 'decline'].includes(action)) throw badRequest('Choose accept or decline');
  const membership = await db.query.organizationMemberships.findFirst({ where: (t, { and, eq }) => and(eq(t.id, membershipId), eq(t.worker_account_id, accountId), eq(t.status, 'invited')) });
  if (!membership) throw notFound('This organization invitation is no longer pending');
  const profile = await db.query.personProfiles.findFirst({ where: (t, { and, eq, inArray, isNull }) => and(eq(t.owner_account_id, accountId), inArray(t.member_type, ['self', 'adult', 'employee']), isNull(t.deleted_at)) });
  if (!profile || Date.now() - new Date(profile.birthdate).getTime() < 18 * 365.2425 * 24 * 60 * 60 * 1000) throw forbidden('Minors must have a linked guardian accept school membership invitations');
  const result = await db.transaction(async (tx) => {
    const status = action === 'accept' ? 'active' : 'ended';
    const [updated] = await tx.update(schema.organizationMemberships).set({ status, responded_at: new Date(), ended_at: action === 'decline' ? new Date() : null, updated_at: new Date() })
      .where(and(eq(schema.organizationMemberships.id, membershipId), eq(schema.organizationMemberships.status, 'invited'))).returning();
    if (!updated) throw badRequest('This invitation has already been answered');
    if (action === 'accept' && profile.member_type !== 'employee') await tx.update(schema.personProfiles).set({ member_type: 'employee', updated_at: new Date() }).where(eq(schema.personProfiles.id, profile.id));
    return { id: updated.id, status };
  });
  const organization = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, membership.organization_account_id) });
  await notifyAccount(membership.organization_account_id, `org-invite-response:${membership.id}`, 'organization', 'Workforce invitation answered', `The invited worker ${action === 'accept' ? 'accepted' : 'declined'} your organization link.`, '/dashboard/provider/workforce');
  if (action === 'accept') await notifyAccount(accountId, `org-invite-accepted:${membership.id}`, 'organization', 'Organization link accepted', `You joined ${organization?.display_name ?? 'the organization'}.`, '/dashboard/career');
  return result;
}

export async function listGuardianOrganizationInvitations(guardianId: string) {
  const organizationAccounts = alias(schema.accounts, 'organization_accounts');
  const rows = await db.select({ membership: schema.organizationMemberships, profile: schema.personProfiles, organization: organizationAccounts, provider: schema.serviceProviders })
    .from(schema.familyMembers)
    .innerJoin(schema.families, eq(schema.families.id, schema.familyMembers.family_id))
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.id, schema.familyMembers.person_profile_id))
    .innerJoin(schema.organizationMemberships, eq(schema.organizationMemberships.worker_account_id, schema.personProfiles.owner_account_id))
    .innerJoin(organizationAccounts, eq(organizationAccounts.id, schema.organizationMemberships.organization_account_id))
    .leftJoin(schema.serviceProviders, eq(schema.serviceProviders.account_id, schema.organizationMemberships.organization_account_id))
    .where(and(eq(schema.families.account_id, guardianId), eq(schema.familyMembers.member_role, 'underage'), eq(schema.organizationMemberships.status, 'invited')));
  return rows.map(({ membership, profile, organization, provider }) => ({ id: membership.id, minor_name: profile.common_name?.trim() || `${profile.first_name} ${profile.last_name}`.trim(), organization_name: provider?.display_name ?? organization.username, organization_type: organization.account_type, invited_at: membership.created_at }));
}

export async function respondToGuardianOrganizationInvitation(guardianId: string, membershipId: string, dto: any) {
  const action = String(dto.action ?? '');
  if (!['accept', 'decline'].includes(action)) throw badRequest('Choose accept or decline');
  const workerAccounts = alias(schema.accounts, 'worker_accounts');
  const organizationAccounts = alias(schema.accounts, 'organization_accounts');
  const row = await db.select({ membership: schema.organizationMemberships, profile: schema.personProfiles, organization: organizationAccounts })
    .from(schema.organizationMemberships)
    .innerJoin(workerAccounts, eq(workerAccounts.id, schema.organizationMemberships.worker_account_id))
    .innerJoin(schema.personProfiles, eq(schema.personProfiles.owner_account_id, workerAccounts.id))
    .innerJoin(organizationAccounts, eq(organizationAccounts.id, schema.organizationMemberships.organization_account_id))
    .where(and(eq(schema.organizationMemberships.id, membershipId), eq(schema.organizationMemberships.status, 'invited'))).limit(1);
  const invite = row[0];
  if (!invite || invite.organization.account_type !== 'school') throw notFound('Pending school invitation not found');
  const guardianLink = await db.select({ family_id: schema.familyMembers.family_id }).from(schema.familyMembers)
    .innerJoin(schema.families, eq(schema.families.id, schema.familyMembers.family_id))
    .where(and(eq(schema.familyMembers.person_profile_id, invite.profile.id), eq(schema.familyMembers.member_role, 'underage'), eq(schema.families.account_id, guardianId))).limit(1);
  if (!guardianLink.length) throw forbidden('You are not the guardian linked to this minor');
  const [updated] = await db.update(schema.organizationMemberships).set({ status: action === 'accept' ? 'active' : 'ended', responded_at: new Date(), ended_at: action === 'decline' ? new Date() : null, updated_at: new Date() })
    .where(and(eq(schema.organizationMemberships.id, membershipId), eq(schema.organizationMemberships.status, 'invited'))).returning({ id: schema.organizationMemberships.id, status: schema.organizationMemberships.status });
  if (!updated) throw badRequest('This invitation has already been answered');
  const organization = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, invite.membership.organization_account_id) });
  await notifyAccount(guardianId, `minor-org-invite-response:${membershipId}:${guardianId}`, 'organization', 'Student school link updated', `${invite.profile.common_name?.trim() || 'The student'} ${action === 'accept' ? 'joined' : 'declined an invitation from'} ${organization?.display_name ?? 'a school'}.`, '/dashboard/requests');
  await notifyAccount(invite.membership.organization_account_id, `minor-org-invite-response:${membershipId}`, 'organization', 'Guardian reviewed a student link', `The family guardian ${action === 'accept' ? 'accepted' : 'declined'} the school roster invitation.`, '/dashboard/provider/workforce');
  return updated;
}

export async function endOrganizationMembership(accountId: string, membershipId: string) {
  await requireOrganizationAdmin(accountId);
  const membership = await db.query.organizationMemberships.findFirst({ where: (t, { and, eq }) => and(eq(t.id, membershipId), eq(t.organization_account_id, accountId), eq(t.status, 'active')) });
  if (!membership) throw notFound('Active organization membership not found');
  const activeAssignments = await db.select({ id: schema.serviceAssignments.id }).from(schema.serviceAssignments)
    .innerJoin(schema.serviceRequests, eq(schema.serviceAssignments.request_id, schema.serviceRequests.id))
    .where(and(eq(schema.serviceAssignments.worker_account_id, membership.worker_account_id), eq(schema.serviceAssignments.provider_id, (await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) }))?.id ?? ''), eq(schema.serviceAssignments.status, 'active'), inArray(schema.serviceRequests.status, ['accepted', 'in_progress'])));
  if (activeAssignments.length) throw badRequest('Reassign or complete this worker’s active service jobs before ending membership');
  const [updated] = await db.update(schema.organizationMemberships).set({ status: 'ended', ended_at: new Date(), updated_at: new Date() }).where(eq(schema.organizationMemberships.id, membershipId)).returning();
  await notifyAccount(membership.worker_account_id, `org-membership-ended:${membership.id}`, 'organization', 'Organization membership ended', 'Your link to an organization ended. Your account and career history remain yours.', '/dashboard/career');
  return { id: updated.id, status: updated.status };
}

export async function setOrganizationMembershipStatus(accountId: string, membershipId: string, dto: any) {
  await requireOrganizationAdmin(accountId);
  const status = String(dto.status ?? '');
  if (!['active', 'suspended'].includes(status)) throw badRequest('Choose active or suspended');
  const membership = await db.query.organizationMemberships.findFirst({ where: (t, { and, eq }) => and(eq(t.id, membershipId), eq(t.organization_account_id, accountId), inArray(t.status, ['active', 'suspended'])) });
  if (!membership) throw notFound('Organization membership not found');
  if (status === 'suspended' && membership.status === 'active') {
    const provider = await db.query.serviceProviders.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    const activeJobs = provider ? await db.select({ id: schema.serviceAssignments.id }).from(schema.serviceAssignments)
      .innerJoin(schema.serviceRequests, eq(schema.serviceAssignments.request_id, schema.serviceRequests.id))
      .where(and(eq(schema.serviceAssignments.worker_account_id, membership.worker_account_id), eq(schema.serviceAssignments.provider_id, provider.id), eq(schema.serviceAssignments.status, 'active'), inArray(schema.serviceRequests.status, ['accepted', 'in_progress']))) : [];
    if (activeJobs.length) throw badRequest('Reassign or complete active service jobs before suspending this worker');
  }
  const [updated] = await db.update(schema.organizationMemberships).set({ status: status as 'active' | 'suspended', ended_at: null, updated_at: new Date() }).where(eq(schema.organizationMemberships.id, membership.id)).returning({ id: schema.organizationMemberships.id, status: schema.organizationMemberships.status });
  await notifyAccount(membership.worker_account_id, `org-membership-${status}:${membership.id}:${Date.now()}`, 'organization', status === 'suspended' ? 'Organization membership suspended' : 'Organization membership reinstated', status === 'suspended' ? 'Your organization has suspended this membership. Contact its administrator if you need details.' : 'Your organization membership is active again.', '/dashboard/career');
  return updated;
}
