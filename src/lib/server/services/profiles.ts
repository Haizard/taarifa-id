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

  await linkMember(owner, profile.id, memberType);
  return profile;
}

async function entityIdFor(account: any) {
  switch (account.account_type) {
    case 'family': {
      const f = await db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      if (!f) throw badRequest('Create your family details first before adding members');
      return f.id;
    }
    case 'school': {
      const s = await db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      if (!s) throw badRequest('Create your school details first before adding members');
      return s.id;
    }
    case 'business': {
      const b = await db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      if (!b) throw badRequest('Create your business details first before adding members');
      return b.id;
    }
    case 'institution': {
      const i = await db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      if (!i) throw badRequest('Create your institution details first before adding members');
      return i.id;
    }
    default:
      return null;
  }
}

async function linkMember(owner: any, profileId: string, memberType: string) {
  const entityId = await entityIdFor(owner);
  if (entityId === null) return;
  if (owner.account_type === 'family') {
    await db.insert(schema.familyMembers).values({ family_id: entityId, person_profile_id: profileId, member_role: memberType === 'underage' ? 'underage' : 'adult' });
  } else if (owner.account_type === 'school') {
    await db.insert(schema.schoolMembers).values({ school_id: entityId, person_profile_id: profileId, beneficiary_type: memberType === 'student' ? 'student' : 'employee' });
  } else if (owner.account_type === 'business') {
    await db.insert(schema.businessMembers).values({ business_id: entityId, person_profile_id: profileId });
  } else if (owner.account_type === 'institution') {
    await db.insert(schema.institutionMembers).values({ institution_id: entityId, person_profile_id: profileId });
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
  const parentAccountId = account.parent_account_id ?? accountId;
  switch (account.account_type) {
    case 'family': return db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, parentAccountId), with: { doctors: true, links: true } }) ?? null;
    case 'school': return db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, parentAccountId) }) ?? null;
    case 'business': return db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, parentAccountId) }) ?? null;
    case 'institution': return db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, parentAccountId) }) ?? null;
    default: return null;
  }
}

const ENTITY_FIELDS: Record<string, string[]> = {
  family: [
    'family_name', 'family_pic_url', 'region', 'district', 'ward', 'local_authority_name',
    'street', 'extra_physical_details', 'emergency_contact_1', 'emergency_contact_2',
    'neighborhood_friend_name', 'neighborhood_friend_contacts',
  ],
  school: [
    'school_name', 'registration_number', 'ownership', 'school_logo_url', 'region', 'district',
    'ward', 'local_authority_name', 'extra_notes', 'school_contacts', 'manager_contacts',
  ],
  business: [
    'business_name', 'dealership', 'tin_number', 'business_logo_url', 'region', 'district',
    'ward', 'local_authority_name', 'extra_notes', 'business_contacts', 'manager_contacts',
  ],
  institution: [
    'institution_name', 'dealership', 'tin_number', 'institution_logo_url', 'region', 'district',
    'ward', 'local_authority_name', 'extra_notes', 'institution_contacts', 'manager_contacts',
  ],
};

function sanitizeEntityDto(type: string, dto: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set(ENTITY_FIELDS[type] ?? []);
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dto)) {
    if (allowed.has(key) && value !== undefined) clean[key] = value;
  }
  if (type === 'family' && dto.extra_notes !== undefined && clean.extra_physical_details === undefined) {
    clean.extra_physical_details = dto.extra_notes;
  }
  if (type === 'school' && dto.contacts !== undefined && clean.school_contacts === undefined) {
    clean.school_contacts = dto.contacts;
  }
  if (type === 'business' && dto.contacts !== undefined && clean.business_contacts === undefined) {
    clean.business_contacts = dto.contacts;
  }
  if (type === 'institution' && dto.contacts !== undefined && clean.institution_contacts === undefined) {
    clean.institution_contacts = dto.contacts;
  }
  return clean;
}

export async function upsertEntityDetails(accountId: string, dto: any) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');
  const type = account.account_type;
  const data = sanitizeEntityDto(type, dto);

  if (type === 'family') {
    const existing = await db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.families).set(data).where(eq(schema.families.id, existing.id));
      return db.query.families.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.families).values({ account_id: accountId, family_name: (data.family_name as string) ?? 'Family', ...data }).returning();
  }
  if (type === 'school') {
    const existing = await db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.schools).set(data).where(eq(schema.schools.id, existing.id));
      return db.query.schools.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.schools).values({ account_id: accountId, school_name: (data.school_name as string) ?? 'School', ...data }).returning();
  }
  if (type === 'business') {
    const existing = await db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.businesses).set(data).where(eq(schema.businesses.id, existing.id));
      return db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.businesses).values({ account_id: accountId, business_name: (data.business_name as string) ?? 'Business', ...data }).returning();
  }
  if (type === 'institution') {
    const existing = await db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await db.update(schema.institutions).set(data).where(eq(schema.institutions.id, existing.id));
      return db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.id, existing.id) });
    }
    return db.insert(schema.institutions).values({ account_id: accountId, institution_name: (data.institution_name as string) ?? 'Institution', ...data }).returning();
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
