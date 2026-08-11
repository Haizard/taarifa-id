import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';
import { CreatePersonProfileDto, UpdatePersonProfileDto, UpsertSubFormsDto } from './profiles.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async getMyProfiles(accountId: string) {
    return this.db.query.personProfiles.findMany({
      where: (t, { eq }) => eq(t.owner_account_id, accountId),
      with: {
        mobileNumbers: true,
        health: true,
        residence: true,
        desperateConditions: true,
        emergencyContacts: true,
        employment: { with: { employers: true, supervisors: true } },
      },
    });
  }

  async getProfile(accountId: string, profileId: string) {
    const profile = await this.db.query.personProfiles.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, profileId), eq(t.owner_account_id, accountId)),
      with: {
        mobileNumbers: true,
        health: true,
        residence: true,
        desperateConditions: true,
        emergencyContacts: true,
        employment: { with: { employers: true, supervisors: true } },
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async createMember(accountId: string, dto: CreatePersonProfileDto) {
    const owner = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!owner) throw new NotFoundException('Account not found');
    if (owner.role === 'individual') throw new ForbiddenException('Individual accounts cannot create members');

    const memberType = dto.member_type ?? 'employee';
    const [profile] = await this.db
      .insert(schema.personProfiles)
      .values({
        owner_account_id: accountId,
        member_type: memberType as typeof schema.memberTypeEnum.enumValues[number],
        common_name: dto.common_name ?? null,
        profile_code: `MB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        first_name: dto.first_name,
        middle_name: dto.middle_name ?? null,
        last_name: dto.last_name,
        gender: dto.gender,
        birthdate: new Date(dto.birthdate),
        nationality: dto.nationality,
        nida_number: dto.nationality === 'Tanzanian' ? dto.nida_number ?? null : null,
        passport_number: dto.nationality === 'Foreign' ? dto.passport_number ?? null : null,
        fluent_language: dto.fluent_language ?? null,
      })
      .returning();

    // Link to account-type-specific member table
    await this.linkMember(owner.account_type, owner.id, profile.id, memberType);
    return profile;
  }

  private async linkMember(accountType: string, accountId: string, profileId: string, memberType: string) {
    if (accountType === 'family') {
      await this.db.insert(schema.familyMembers).values({ family_id: accountId, person_profile_id: profileId, member_role: memberType === 'underage' ? 'underage' : 'adult' });
    } else if (accountType === 'school') {
      await this.db.insert(schema.schoolMembers).values({ school_id: accountId, person_profile_id: profileId, beneficiary_type: memberType === 'student' ? 'student' : 'employee' });
    } else if (accountType === 'business') {
      await this.db.insert(schema.businessMembers).values({ business_id: accountId, person_profile_id: profileId });
    } else if (accountType === 'institution') {
      await this.db.insert(schema.institutionMembers).values({ institution_id: accountId, person_profile_id: profileId });
    }
  }

  async updateProfile(accountId: string, profileId: string, dto: UpdatePersonProfileDto) {
    const existing = await this.db.query.personProfiles.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, profileId), eq(t.owner_account_id, accountId)),
    });
    if (!existing) throw new NotFoundException('Profile not found');

    const [updated] = await this.db
      .update(schema.personProfiles)
      .set({
        first_name: dto.first_name,
        middle_name: dto.middle_name ?? null,
        last_name: dto.last_name,
        gender: dto.gender,
        birthdate: new Date(dto.birthdate),
        nationality: dto.nationality,
        nida_number: dto.nationality === 'Tanzanian' ? dto.nida_number ?? null : null,
        passport_number: dto.nationality === 'Foreign' ? dto.passport_number ?? null : null,
        fluent_language: dto.fluent_language ?? null,
        pic_url: dto.pic_url ?? existing.pic_url,
      })
      .where(eq(schema.personProfiles.id, profileId))
      .returning();
    return updated;
  }

  async upsertSubForms(accountId: string, profileId: string, dto: UpsertSubFormsDto) {
    const existing = await this.db.query.personProfiles.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, profileId), eq(t.owner_account_id, accountId)),
    });
    if (!existing) throw new NotFoundException('Profile not found');

    // Mobile numbers
    if (dto.mobile_numbers) {
      await this.db.delete(schema.mobileNumbers).where(eq(schema.mobileNumbers.person_profile_id, profileId));
      for (const m of dto.mobile_numbers) {
        await this.db.insert(schema.mobileNumbers).values({ person_profile_id: profileId, number: m.number, is_primary: m.is_primary ?? false });
      }
    }

    // Health
    if (dto.health) {
      const existingHealth = await this.db.query.basicHealthDetails.findFirst({
        where: (t, { eq }) => eq(t.person_profile_id, profileId),
      });
      if (existingHealth) {
        await this.db.update(schema.basicHealthDetails).set(dto.health).where(eq(schema.basicHealthDetails.id, existingHealth.id));
      } else {
        await this.db.insert(schema.basicHealthDetails).values({ person_profile_id: profileId, ...dto.health });
      }
    }

    // Residence
    if (dto.residence) {
      const existingRes = await this.db.query.residences.findFirst({ where: (t, { eq }) => eq(t.person_profile_id, profileId) });
      if (existingRes) {
        await this.db.update(schema.residences).set(dto.residence).where(eq(schema.residences.id, existingRes.id));
      } else {
        await this.db.insert(schema.residences).values({ person_profile_id: profileId, ...dto.residence });
      }
    }

    // Desperate conditions
    if (dto.desperate_conditions) {
      await this.db.delete(schema.desperateConditions).where(eq(schema.desperateConditions.person_profile_id, profileId));
      for (const c of dto.desperate_conditions) {
        await this.db.insert(schema.desperateConditions).values({ person_profile_id: profileId, ...c });
      }
    }

    // Emergency contacts (max 3)
    if (dto.emergency_contacts) {
      if (dto.emergency_contacts.length > 3) throw new BadRequestException('Maximum 3 emergency contacts allowed');
      await this.db.delete(schema.emergencyContacts).where(eq(schema.emergencyContacts.person_profile_id, profileId));
      const priorities: ('prime' | 'option_2' | 'option_3')[] = ['prime', 'option_2', 'option_3'];
      for (let i = 0; i < dto.emergency_contacts.length; i++) {
        const c = dto.emergency_contacts[i];
        await this.db.insert(schema.emergencyContacts).values({
          person_profile_id: profileId,
          priority: c.priority ?? priorities[i],
          full_name: c.full_name,
          mobile_1: c.mobile_1 ?? null,
          mobile_2: c.mobile_2 ?? null,
          alt_number_1: c.alt_number_1 ?? null,
          alt_number_2: c.alt_number_2 ?? null,
          relation_type: (c.relation_type as typeof schema.relationTypeEnum.enumValues[number]) ?? null,
          residence_details: c.residence_details ?? null,
          fluent_language: c.fluent_language ?? null,
          region: c.region ?? null,
          district: c.district ?? null,
          ward: c.ward ?? null,
          local_authority_name: c.local_authority_name ?? null,
          extra_notes: c.extra_notes ?? null,
        });
      }
    }

    // Employment
    if (dto.employment) {
      const isLocked = dto.employment.employment_type === 'Not_Working';
      const existingEmp = await this.db.query.employmentDetails.findFirst({
        where: (t, { eq }) => eq(t.person_profile_id, profileId),
      });
      if (existingEmp) {
        await this.db.update(schema.employmentDetails).set({ employment_type: dto.employment.employment_type as typeof schema.employmentTypeEnum.enumValues[number], is_locked: isLocked }).where(eq(schema.employmentDetails.id, existingEmp.id));
        if (!isLocked && dto.employment.employer) {
          const existingEmployer = await this.db.query.employers.findFirst({ where: (t, { eq }) => eq(t.employment_detail_id, existingEmp.id) });
          if (existingEmployer) {
            await this.db.update(schema.employers).set(dto.employment.employer).where(eq(schema.employers.id, existingEmployer.id));
          } else {
            await this.db.insert(schema.employers).values({ employment_detail_id: existingEmp.id, ...dto.employment.employer });
          }
        }
        if (!isLocked && dto.employment.supervisor) {
          const existingSup = await this.db.query.supervisors.findFirst({ where: (t, { eq }) => eq(t.employment_detail_id, existingEmp.id) });
          if (existingSup) {
            await this.db.update(schema.supervisors).set(dto.employment.supervisor).where(eq(schema.supervisors.id, existingSup.id));
          } else {
            await this.db.insert(schema.supervisors).values({ employment_detail_id: existingEmp.id, ...dto.employment.supervisor });
          }
        }
      } else {
        const [emp] = await this.db.insert(schema.employmentDetails).values({ person_profile_id: profileId, employment_type: dto.employment.employment_type as typeof schema.employmentTypeEnum.enumValues[number], is_locked: isLocked }).returning();
        if (!isLocked && dto.employment.employer) {
          await this.db.insert(schema.employers).values({ employment_detail_id: emp.id, ...dto.employment.employer });
        }
        if (!isLocked && dto.employment.supervisor) {
          await this.db.insert(schema.supervisors).values({ employment_detail_id: emp.id, ...dto.employment.supervisor });
        }
      }
    }

    return this.getProfile(accountId, profileId);
  }

  // ===== Account-type entity details =====
  async getEntityDetails(accountId: string) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!account) throw new NotFoundException('Account not found');
    switch (account.account_type) {
      case 'family': return this.db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId), with: { doctors: true, links: true } });
      case 'school': return this.db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
      case 'business': return this.db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
      case 'institution': return this.db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
      default: return null;
    }
  }

  async upsertEntityDetails(accountId: string, dto: any) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!account) throw new NotFoundException('Account not found');
    const type = account.account_type;

    if (type === 'family') {
      const existing = await this.db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
      if (existing) {
        await this.db.update(schema.families).set(dto).where(eq(schema.families.id, existing.id));
        return this.db.query.families.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
      }
      return this.db.insert(schema.families).values({ account_id: accountId, family_name: dto.family_name ?? 'Family', ...dto }).returning();
    }
    if (type === 'school') {
      const existing = await this.db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
      if (existing) {
        await this.db.update(schema.schools).set(dto).where(eq(schema.schools.id, existing.id));
        return this.db.query.schools.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
      }
      return this.db.insert(schema.schools).values({ account_id: accountId, school_name: dto.school_name ?? 'School', ...dto }).returning();
    }
    if (type === 'business') {
      const existing = await this.db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
      if (existing) {
        await this.db.update(schema.businesses).set(dto).where(eq(schema.businesses.id, existing.id));
        return this.db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
      }
      return this.db.insert(schema.businesses).values({ account_id: accountId, business_name: dto.business_name ?? 'Business', ...dto }).returning();
    }
    if (type === 'institution') {
      const existing = await this.db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
      if (existing) {
        await this.db.update(schema.institutions).set(dto).where(eq(schema.institutions.id, existing.id));
        return this.db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
      }
      return this.db.insert(schema.institutions).values({ account_id: accountId, institution_name: dto.institution_name ?? 'Institution', ...dto }).returning();
    }
    throw new BadRequestException('Account type has no entity details');
  }

  async getMembers(accountId: string) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!account) throw new NotFoundException('Account not found');
    const profiles = await this.db.query.personProfiles.findMany({
      where: (t, { eq, ne }) => eq(t.owner_account_id, accountId),
      with: {
        mobileNumbers: true,
        health: true,
        residence: true,
        emergencyContacts: true,
        desperateConditions: true,
        employment: { with: { employers: true, supervisors: true } },
      },
    });
    return profiles.filter((p) => p.member_type !== 'self');
  }
}
