import * as bcrypt from 'bcryptjs';
import { eq, and, isNull, or } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, notFound } from '../errors';
import type { CreateSubAccountDto, ResetSubPasswordDto, MoveAccountDto } from '../dto';

export async function getMe(accountId: string) {
  const account = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.id, accountId),
    with: { personProfiles: true, profileStatus: true },
  });
  if (!account) throw notFound('Account not found');
  const { password_hash, ...safe } = account;
  return safe;
}

export async function getSubAccounts(accountId: string) {
  const me = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!me || me.role !== 'admin') throw badRequest('Only Admin accounts can manage sub-accounts');

  const subs = await db.query.accounts.findMany({
    where: (t, { and, eq, isNull }) => and(eq(t.parent_account_id, me.id), isNull(t.deleted_at)),
    with: { personProfiles: true },
  });
  return subs.map(({ password_hash, ...safe }) => safe);
}

export async function createSubAccount(parentId: string, dto: CreateSubAccountDto) {
  const parent = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, parentId) });
  if (!parent || parent.role !== 'admin') throw badRequest('Only Admin accounts can create sub-accounts');

  const existing = await db.query.accounts.findFirst({
    where: (t, { or }) => or(eq(t.mobile_number, dto.mobile_number), eq(t.username, dto.username)),
  });
  if (existing) throw badRequest('Mobile number or username already taken');

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const [sub] = await db
    .insert(schema.accounts)
    .values({
      account_type: parent.account_type,
      role: 'user',
      profile_id: `TID-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
      username: dto.username,
      password_hash: passwordHash,
      mobile_number: dto.mobile_number,
      status: 'active',
      is_reseller: false,
      never_expires: false,
      parent_account_id: parent.id,
      first_login_at: new Date(),
    })
    .returning();

  await db.insert(schema.personProfiles).values({
    owner_account_id: sub.id,
    member_type: 'self',
    profile_code: sub.profile_id,
    first_name: dto.first_name,
    middle_name: dto.middle_name ?? null,
    last_name: dto.last_name,
    gender: dto.gender,
    birthdate: new Date(dto.birthdate),
    nationality: dto.nationality,
    nida_number: dto.nationality === 'Tanzanian' ? dto.nida_number ?? null : null,
    passport_number: dto.nationality === 'Foreign' ? dto.passport_number ?? null : null,
  });

  await db.insert(schema.profileStatus).values({ account_id: sub.id, status: 'active' });

  return { ...sub, password_hash: undefined };
}

export async function setLock(accountId: string, locked: boolean) {
  const target = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!target) throw notFound('Account not found');
  await db.update(schema.accounts).set({ status: locked ? 'locked' : 'active' }).where(eq(schema.accounts.id, accountId));
  return { message: locked ? 'Account locked' : 'Account unlocked' };
}

export async function resetSubPassword(dto: ResetSubPasswordDto) {
  const target = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, dto.account_id) });
  if (!target) throw notFound('Account not found');
  const passwordHash = await bcrypt.hash(dto.new_password, 10);
  await db.update(schema.accounts).set({ password_hash: passwordHash }).where(eq(schema.accounts.id, dto.account_id));
  return { message: 'Password reset' };
}

export async function moveAccount(accountId: string, dto: MoveAccountDto) {
  const mover = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!mover) throw notFound('Account not found');
  if (mover.role === 'admin' || mover.role === 'system_admin') throw badRequest('Admin accounts cannot be moved');

  const target = await db.query.accounts.findFirst({
    where: (t, { and, eq, isNull }) =>
      and(eq(t.profile_id, dto.profile_id), eq(t.role, 'admin'), eq(t.account_type, dto.target_scheme), isNull(t.deleted_at)),
  });
  if (!target) throw badRequest('Target scheme profile not found');

  const ok = await bcrypt.compare(dto.password, target.password_hash);
  if (!ok || target.username !== dto.username) throw badRequest('Invalid target scheme credentials');

  const self = await db.query.personProfiles.findFirst({
    where: (t, { and, eq }) => and(eq(t.owner_account_id, mover.id), eq(t.member_type, 'self')),
  });
  if (!self) throw badRequest('No self profile to move');

  await removeMemberLinks(mover.account_type, mover.id, self.id);
  await addMemberLink(dto.target_scheme, target.id, self.id);

  await db.update(schema.accounts).set({ account_type: dto.target_scheme, parent_account_id: target.id }).where(eq(schema.accounts.id, mover.id));

  return { message: `Account moved to ${dto.target_scheme} scheme`, profile_id: mover.profile_id };
}

async function removeMemberLinks(accountType: string, accountId: string, profileId: string) {
  const byProfile = (t: any) => eq(t.person_profile_id, profileId);
  if (accountType === 'family')
    await db.delete(schema.familyMembers).where(and(eq(schema.familyMembers.family_id, accountId), byProfile(schema.familyMembers)));
  if (accountType === 'school')
    await db.delete(schema.schoolMembers).where(and(eq(schema.schoolMembers.school_id, accountId), byProfile(schema.schoolMembers)));
  if (accountType === 'business')
    await db.delete(schema.businessMembers).where(and(eq(schema.businessMembers.business_id, accountId), byProfile(schema.businessMembers)));
  if (accountType === 'institution')
    await db.delete(schema.institutionMembers).where(and(eq(schema.institutionMembers.institution_id, accountId), byProfile(schema.institutionMembers)));
}

async function addMemberLink(accountType: string, accountId: string, profileId: string) {
  if (accountType === 'family') await db.insert(schema.familyMembers).values({ family_id: accountId, person_profile_id: profileId, member_role: 'adult' });
  if (accountType === 'school') await db.insert(schema.schoolMembers).values({ school_id: accountId, person_profile_id: profileId, beneficiary_type: 'employee' });
  if (accountType === 'business') await db.insert(schema.businessMembers).values({ business_id: accountId, person_profile_id: profileId });
  if (accountType === 'institution') await db.insert(schema.institutionMembers).values({ institution_id: accountId, person_profile_id: profileId });
}
