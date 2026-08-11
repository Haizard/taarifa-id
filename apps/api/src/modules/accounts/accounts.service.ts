import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';
import { CreateSubAccountDto, ResetSubPasswordDto, MoveAccountDto } from './accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async getMe(accountId: string) {
    const account = await this.db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.id, accountId),
      with: { personProfiles: true, profileStatus: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    const { password_hash, ...safe } = account;
    return safe;
  }

  async getSubAccounts(accountId: string) {
    const me = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!me || me.role !== 'admin') throw new BadRequestException('Only Admin accounts can manage sub-accounts');

    const subs = await this.db.query.accounts.findMany({
      where: (t, { and, eq, isNull }) => and(eq(t.parent_account_id, me.id), isNull(t.deleted_at)),
      with: { personProfiles: true },
    });
    return subs.map(({ password_hash, ...safe }) => safe);
  }

  async createSubAccount(parentId: string, dto: CreateSubAccountDto) {
    const parent = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, parentId) });
    if (!parent || parent.role !== 'admin') throw new BadRequestException('Only Admin accounts can create sub-accounts');

    const existing = await this.db.query.accounts.findFirst({
      where: (t, { or }) => or(eq(t.mobile_number, dto.mobile_number), eq(t.username, dto.username)),
    });
    if (existing) throw new BadRequestException('Mobile number or username already taken');

    const hash = await bcrypt.hash(dto.password, 10);
    const [sub] = await this.db
      .insert(schema.accounts)
      .values({
        account_type: parent.account_type,
        role: 'user',
        profile_id: `TID-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        username: dto.username,
        password_hash: hash,
        mobile_number: dto.mobile_number,
        status: 'active',
        is_reseller: false,
        never_expires: false,
        parent_account_id: parent.id,
        first_login_at: new Date(),
      })
      .returning();

    await this.db.insert(schema.personProfiles).values({
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

    await this.db.insert(schema.profileStatus).values({ account_id: sub.id, status: 'active' });

    return { ...sub, password_hash: undefined };
  }

  async setLock(accountId: string, locked: boolean) {
    const target = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!target) throw new NotFoundException('Account not found');
    await this.db.update(schema.accounts).set({ status: locked ? 'locked' : 'active' }).where(eq(schema.accounts.id, accountId));
    return { message: locked ? 'Account locked' : 'Account unlocked' };
  }

  async resetSubPassword(dto: ResetSubPasswordDto) {
    const target = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, dto.account_id) });
    if (!target) throw new NotFoundException('Account not found');
    const hash = await bcrypt.hash(dto.new_password, 10);
    await this.db.update(schema.accounts).set({ password_hash: hash }).where(eq(schema.accounts.id, dto.account_id));
    return { message: 'Password reset' };
  }

  async moveAccount(accountId: string, dto: MoveAccountDto) {
    const mover = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!mover) throw new NotFoundException('Account not found');
    if (mover.role === 'admin' || mover.role === 'system_admin')
      throw new BadRequestException('Admin accounts cannot be moved');

    const target = await this.db.query.accounts.findFirst({
      where: (t, { and, eq, isNull }) =>
        and(eq(t.profile_id, dto.profile_id), eq(t.role, 'admin'), eq(t.account_type, dto.target_scheme), isNull(t.deleted_at)),
    });
    if (!target) throw new BadRequestException('Target scheme profile not found');

    const ok = await bcrypt.compare(dto.password, target.password_hash);
    if (!ok || target.username !== dto.username)
      throw new BadRequestException('Invalid target scheme credentials');

    const self = await this.db.query.personProfiles.findFirst({
      where: (t, { and, eq }) => and(eq(t.owner_account_id, mover.id), eq(t.member_type, 'self')),
    });
    if (!self) throw new BadRequestException('No self profile to move');

    await this.removeMemberLinks(mover.account_type, mover.id, self.id);
    await this.addMemberLink(dto.target_scheme, target.id, self.id);

    await this.db.update(schema.accounts).set({ account_type: dto.target_scheme, parent_account_id: target.id }).where(eq(schema.accounts.id, mover.id));

    return { message: `Account moved to ${dto.target_scheme} scheme`, profile_id: mover.profile_id };
  }

  private async removeMemberLinks(accountType: string, accountId: string, profileId: string) {
    const byProfile = (t: any) => eq(t.person_profile_id, profileId);
    if (accountType === 'family')
      await this.db.delete(schema.familyMembers).where(and(eq(schema.familyMembers.family_id, accountId), byProfile(schema.familyMembers)));
    if (accountType === 'school')
      await this.db.delete(schema.schoolMembers).where(and(eq(schema.schoolMembers.school_id, accountId), byProfile(schema.schoolMembers)));
    if (accountType === 'business')
      await this.db.delete(schema.businessMembers).where(and(eq(schema.businessMembers.business_id, accountId), byProfile(schema.businessMembers)));
    if (accountType === 'institution')
      await this.db.delete(schema.institutionMembers).where(and(eq(schema.institutionMembers.institution_id, accountId), byProfile(schema.institutionMembers)));
  }

  private async addMemberLink(accountType: string, accountId: string, profileId: string) {
    if (accountType === 'family') await this.db.insert(schema.familyMembers).values({ family_id: accountId, person_profile_id: profileId, member_role: 'adult' });
    if (accountType === 'school') await this.db.insert(schema.schoolMembers).values({ school_id: accountId, person_profile_id: profileId, beneficiary_type: 'employee' });
    if (accountType === 'business') await this.db.insert(schema.businessMembers).values({ business_id: accountId, person_profile_id: profileId });
    if (accountType === 'institution') await this.db.insert(schema.institutionMembers).values({ institution_id: accountId, person_profile_id: profileId });
  }
}
