import { eq, and } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { badRequest, forbidden, notFound } from '../errors';
import type { CreatePersonProfileDto, UpdatePersonProfileDto, UpsertSubFormsDto } from '../dto';

const profileWithRelations = {
  mobileNumbers: true,
  health: true,
  residence: true,
  desperateConditions: true,
  emergencyContacts: true,
  employment: { with: { employers: true, supervisors: true } },
} as const;

export async function getMyProfiles(accountId: string) {
  return db.query.personProfiles.findMany({
    where: (t, { eq }) => eq(t.owner_account_id, accountId),
    with: profileWithRelations,
  });
}

export async function getProfile(accountId: string, profileId: string) {
  const profile = await db.query.personProfiles.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, profileId), eq(t.owner_account_id, accountId)),
    with: profileWithRelations,
  });
  if (!profile) throw notFound('Profile not found');
  return profile;
}

export async function createMember(accountId: string, dto: CreatePersonProfileDto) {
  const owner = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!owner) throw notFound('Account not found');
  if (owner.role === 'individual') throw forbidden('Individual accounts cannot create members');

  const memberType = dto.member_type ?? 'employee';
  const [profile] = await db
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

  await linkMember(owner.account_type, owner.id, profile.id, memberType);
  return profile;
}

async function linkMember(accountType: string, accountId: string, profileId: string, memberType: string) {
  if (accountType === 'family') {
    await db.insert(schema.familyMembers).values({ family_id: accountId, person_profile_id: profileId, member_role: memberType === 'underage' ? 'underage' : 'adult' });
  } else if (accountType === 'school') {
    await db.insert(schema.schoolMembers).values({ school_id: accountId, person_profile_id: profileId, beneficiary_type: memberType === 'student' ? 'student' : 'employee' });
  } else if (accountType === 'business') {
    await db.insert(schema.businessMembers).values({ business_id: accountId, person_profile_id: profileId });
  } else if (accountType === 'institution') {
    await db.insert(schema.institutionMembers).values({ institution_id: accountId, person_profile_id: profileId });
  }
}

export async function updateProfile(accountId: string, profileId: string, dto: UpdatePersonProfileDto) {
  const existing = await db.query.personProfiles.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, profileId), eq(t.owner_account_id, accountId)),
  });
  if (!existing) throw notFound('Profile not found');

  const [updated] = await db
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

export async function upsertSubForms(accountId: string, profileId: string, dto: UpsertSubFormsDto) {
  const existing = await db.query.personProfiles.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, profileId), eq(t.owner_account_id, accountId)),
  });
  if (!existing) throw notFound('Profile not found');

  if (dto.mobile_numbers) {
    await db.delete(schema.mobileNumbers).where(eq(schema.mobileNumbers.person_profile_id, profileId));
    for (const m of dto.mobile_numbers) {
      await db.insert(schema.mobileNumbers).values({ person_profile_id: profileId, number: m.number, is_primary: m.is_primary ?? false });
    }
  }

  if (dto.health) {
    const existingHealth = await db.query.basicHealthDetails.findFirst({ where: (t, { eq }) => eq(t.person_profile_id, profileId) });
    if (existingHealth) {
      await db.update(schema.basicHealthDetails).set(dto.health).where(eq(schema.basicHealthDetails.id, existingHealth.id));
    } else {
      await db.insert(schema.basicHealthDetails).values({ person_profile_id: profileId, ...dto.health });
    }
  }

  if (dto.residence) {
    const existingRes = await db.query.residences.findFirst({ where: (t, { eq }) => eq(t.person_profile_id, profileId) });
    if (existingRes) {
      await db.update(schema.residences).set(dto.residence).where(eq(schema.residences.id, existingRes.id));
    } else {
      await db.insert(schema.residences).values({ person_profile_id: profileId, ...dto.residence });
    }
  }

  if (dto.desperate_conditions) {
    await db.delete(schema.desperateConditions).where(eq(schema.desperateConditions.person_profile_id, profileId));
    for (const c of dto.desperate_conditions) {
      await db.insert(schema.desperateConditions).values({ person_profile_id: profileId, ...c });
    }
  }

  if (dto.emergency_contacts) {
    if (dto.emergency_contacts.length > 3) throw badRequest('Maximum 3 emergency contacts allowed');
    await db.delete(schema.emergencyContacts).where(eq(schema.emergencyContacts.person_profile_id, profileId));
    const priorities: ('prime' | 'option_2' | 'option_3')[] = ['prime', 'option_2', 'option_3'];
    for (let i = 0; i < dto.emergency_contacts.length; i++) {
      const c = dto.emergency_contacts[i];
      await db.insert(schema.emergencyContacts).values({
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

  if (dto.employment) {
    const isLocked = dto.employment.employment_type === 'Not_Working';
    const existingEmp = await db.query.employmentDetails.findFirst({ where: (t, { eq }) => eq(t.person_profile_id, profileId) });
    if (existingEmp) {
      await db.update(schema.employmentDetails)
        .set({ employment_type: dto.employment.employment_type as typeof schema.employmentTypeEnum.enumValues[number], is_locked: isLocked })
        .where(eq(schema.employmentDetails.id, existingEmp.id));
      if (!isLocked && dto.employment.employer) {
        const existingEmployer = await db.query.employers.findFirst({ where: (t, { eq }) => eq(t.employment_detail_id, existingEmp.id) });
        if (existingEmployer) {
          await db.update(schema.employers).set(dto.employment.employer).where(eq(schema.employers.id, existingEmployer.id));
        } else {
          await db.insert(schema.employers).values({ employment_detail_id: existingEmp.id, ...dto.employment.employer });
        }
      }
      if (!isLocked && dto.employment.supervisor) {
        const existingSup = await db.query.supervisors.findFirst({ where: (t, { eq }) => eq(t.employment_detail_id, existingEmp.id) });
        if (existingSup) {
          await db.update(schema.supervisors).set(dto.employment.supervisor).where(eq(schema.supervisors.id, existingSup.id));
        } else {
          await db.insert(schema.supervisors).values({ employment_detail_id: existingEmp.id, ...dto.employment.supervisor });
        }
      }
    } else {
      const [emp] = await db.insert(schema.employmentDetails)
        .values({ person_profile_id: profileId, employment_type: dto.employment.employment_type as typeof schema.employmentTypeEnum.enumValues[number], is_locked: isLocked })
        .returning();
      if (!isLocked && dto.employment.employer) {
        await db.insert(schema.employers).values({ employment_detail_id: emp.id, ...dto.employment.employer });
      }
      if (!isLocked && dto.employment.supervisor) {
        await db.insert(schema.supervisors).values({ employment_detail_id: emp.id, ...dto.employment.supervisor });
      }
    }
  }

  return getProfile(accountId, profileId);
}

export async function getEntityDetails(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');
  switch (account.account_type) {
    case 'family': return db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId), with: { doctors: true, links: true } });
    case 'school': return db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    case 'business': return db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    case 'institution': return db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    default: return null;
  }
}

export async function upsertEntityDetails(accountId: string, dto: any) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');
  const type = account.account_type;

  if (type === 'family') {
    const existing = await db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.families).set(dto).where(eq(schema.families.id, existing.id));
      return db.query.families.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.families).values({ account_id: accountId, family_name: dto.family_name ?? 'Family', ...dto }).returning();
  }
  if (type === 'school') {
    const existing = await db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.schools).set(dto).where(eq(schema.schools.id, existing.id));
      return db.query.schools.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.schools).values({ account_id: accountId, school_name: dto.school_name ?? 'School', ...dto }).returning();
  }
  if (type === 'business') {
    const existing = await db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.businesses).set(dto).where(eq(schema.businesses.id, existing.id));
      return db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.businesses).values({ account_id: accountId, business_name: dto.business_name ?? 'Business', ...dto }).returning();
  }
  if (type === 'institution') {
    const existing = await db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.institutions).set(dto).where(eq(schema.institutions.id, existing.id));
      return db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.institutions).values({ account_id: accountId, institution_name: dto.institution_name ?? 'Institution', ...dto }).returning();
  }
  throw badRequest('Account type has no entity details');
}

export async function getMembers(accountId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');
  const profiles = await db.query.personProfiles.findMany({
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
