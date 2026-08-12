import * as bcrypt from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPoolConfig, databaseUrl } from '@taarifa/db';
import * as schema from '@taarifa/db';

/**
 * Demo data seeder.
 *
 * Creates one system admin and one client account per account type
 * (individual / family / school / business / institution), each with a
 * complete profile, sub-forms, members/sub-accounts and payment history so
 * every feature is explorable without onboarding new users.
 *
 * All accounts share the same password (DEMO_PASSWORD env, default "demo1234")
 * and skip the SMS first-login step.
 */

const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234';
const YEARS_FROM_NOW = (years = 1) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d;
};

const pool = new Pool(createPoolConfig(databaseUrl));
const db = drizzle(pool, { schema });

const DEMO_USERNAMES = [
  'demo.systemadmin',
  'demo.individual',
  'demo.family',
  'demo.school',
  'demo.business',
  'demo.institution',
  'member.family',
  'member.school',
  'member.business',
  'member.institution',
];

async function deleteDemoData() {
  const demoAccounts = await db.query.accounts.findMany({
    where: (t, { inArray }) => inArray(t.username, DEMO_USERNAMES),
    columns: { id: true },
  });
  if (demoAccounts.length === 0) return;

  const accountIds = demoAccounts.map((a) => a.id);
  const inIds = (t: any, col: any) => inArray(col, accountIds);
  const byAny = (t: any, ...cols: any[]) =>
    cols.reduce((acc: any, col: any) => acc.or?.(inArray(col, accountIds)) ?? inArray(col, accountIds), undefined);

  const demoProfiles = await db.query.personProfiles.findMany({
    where: (t, { inArray }) => inArray(t.owner_account_id, accountIds),
    columns: { id: true },
  });
  const profileIds = demoProfiles.map((p) => p.id);
  const inPIds = (t: any, col: any) => inArray(col, profileIds);

  const empRows = await db.query.employmentDetails.findMany({
    where: (t, { inArray }) => inArray(t.person_profile_id, profileIds),
    columns: { id: true },
  });
  const empIds = empRows.map((e) => e.id);

  const familyRows = await db.query.families.findMany({
    where: (t, { inArray }) => inArray(t.account_id, accountIds),
    columns: { id: true },
  });
  const familyIds = familyRows.map((f) => f.id);

  const schoolRows = await db.query.schools.findMany({
    where: (t, { inArray }) => inArray(t.account_id, accountIds),
    columns: { id: true },
  });
  const schoolIds = schoolRows.map((s) => s.id);

  const businessRows = await db.query.businesses.findMany({
    where: (t, { inArray }) => inArray(t.account_id, accountIds),
    columns: { id: true },
  });
  const businessIds = businessRows.map((b) => b.id);

  const institutionRows = await db.query.institutions.findMany({
    where: (t, { inArray }) => inArray(t.account_id, accountIds),
    columns: { id: true },
  });
  const institutionIds = institutionRows.map((i) => i.id);

  await db.delete(schema.authCodes).where(inIds(schema.authCodes, schema.authCodes.account_id));
  await db.delete(schema.sessions).where(inIds(schema.sessions, schema.sessions.account_id));
  await db.delete(schema.printableCards).where(inIds(schema.printableCards, schema.printableCards.account_id));
  await db.delete(schema.payments).where(inIds(schema.payments, schema.payments.account_id));
  await db.delete(schema.profileStatus).where(inIds(schema.profileStatus, schema.profileStatus.account_id));
  await db.delete(schema.systemAdminLogs).where(inArray(schema.systemAdminLogs.actor_account_id, accountIds));
  await db.delete(schema.systemAdminLogs).where(inArray(schema.systemAdminLogs.target_account_id, accountIds));

  if (familyIds.length) {
    await db.delete(schema.familyMembers).where(inArray(schema.familyMembers.family_id, familyIds));
    await db.delete(schema.familyDoctors).where(inArray(schema.familyDoctors.family_id, familyIds));
    await db.delete(schema.familyLinks).where(inArray(schema.familyLinks.family_id, familyIds));
    await db.delete(schema.families).where(inArray(schema.families.id, familyIds));
  }
  if (schoolIds.length) {
    await db.delete(schema.schoolMembers).where(inArray(schema.schoolMembers.school_id, schoolIds));
    await db.delete(schema.schools).where(inArray(schema.schools.id, schoolIds));
  }
  if (businessIds.length) {
    await db.delete(schema.businessMembers).where(inArray(schema.businessMembers.business_id, businessIds));
    await db.delete(schema.businesses).where(inArray(schema.businesses.id, businessIds));
  }
  if (institutionIds.length) {
    await db.delete(schema.institutionMembers).where(inArray(schema.institutionMembers.institution_id, institutionIds));
    await db.delete(schema.institutions).where(inArray(schema.institutions.id, institutionIds));
  }

  if (empIds.length) {
    await db.delete(schema.employers).where(inArray(schema.employers.employment_detail_id, empIds));
    await db.delete(schema.supervisors).where(inArray(schema.supervisors.employment_detail_id, empIds));
  }
  if (profileIds.length) {
    await db.delete(schema.employmentDetails).where(inPIds(schema.employmentDetails, schema.employmentDetails.person_profile_id));
    await db.delete(schema.underageSchoolDetails).where(inPIds(schema.underageSchoolDetails, schema.underageSchoolDetails.person_profile_id));
    await db.delete(schema.mobileNumbers).where(inPIds(schema.mobileNumbers, schema.mobileNumbers.person_profile_id));
    await db.delete(schema.basicHealthDetails).where(inPIds(schema.basicHealthDetails, schema.basicHealthDetails.person_profile_id));
    await db.delete(schema.residences).where(inPIds(schema.residences, schema.residences.person_profile_id));
    await db.delete(schema.desperateConditions).where(inPIds(schema.desperateConditions, schema.desperateConditions.person_profile_id));
    await db.delete(schema.emergencyContacts).where(inPIds(schema.emergencyContacts, schema.emergencyContacts.person_profile_id));
    await db.delete(schema.familyLinks).where(inArray(schema.familyLinks.linked_person_profile_id, profileIds));
    await db.delete(schema.personProfiles).where(inIds(schema.personProfiles, schema.personProfiles.owner_account_id));
  }
  await db.delete(schema.accounts).where(inIds(schema.accounts, schema.accounts.id));

  console.log(`Cleaned up ${demoAccounts.length} previous demo accounts`);
}

let hash: string;

async function ensurePasswordHash() {
  if (!hash) hash = await bcrypt.hash(PASSWORD, 10);
  return hash;
}

const person = (
  first_name: string,
  last_name: string,
  gender: 'Male' | 'Female',
  birthdate: string,
  nationality: 'Tanzanian' | 'Foreign' = 'Tanzanian',
  extra: Record<string, unknown> = {},
) => ({
  first_name,
  last_name,
  gender,
  birthdate: new Date(birthdate),
  nationality,
  nida_number: nationality === 'Tanzanian' ? (extra.nida_number as string | undefined) ?? null : null,
  passport_number: nationality === 'Foreign' ? (extra.passport_number as string | undefined) ?? null : null,
  ...extra,
});

const mobileNumbers = (number: string, isPrimary = true) => [{ number, is_primary: isPrimary }];

const health = (blood_group: string, height: string, weight: string) => ({
  blood_group,
  height,
  weight,
});

const residence = (region: string, district: string, ward: string, street = '') => ({
  region,
  district,
  ward,
  local_authority_name: `${ward} Council`,
  street,
  extra_physical_details: 'House number 12, blue gate with a white fence.',
  neighborhood_friend_name: 'Neighbour',
  neighborhood_friend_contacts: '2557XXXXXXXX',
});

const desperateConditions = () => [
  {
    acute_condition_code: 'asthma_attack',
    notes: 'Uses inhaler during an attack',
    occurrence: 'Rare; triggered by cold weather or dust',
    unconscious_treatment_remedy: 'Administer blue inhaler, lay on the side, call emergency',
    treatment_hospital: 'Muhimbili National Hospital',
    hospital_region: 'Dar es Salaam',
    hospital_district: 'Ilala',
    hospital_contacts: '255222150200',
    doctor_name: 'Dr. Neema',
    doctor_contacts: '255755000111',
  },
];

const emergencyContacts = (name: string, mobile: string, relation: string) => [
  {
    priority: 'prime' as const,
    full_name: name,
    mobile_1: mobile,
    relation_type: relation as typeof schema.relationTypeEnum.enumValues[number],
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    ward: 'Mikocheni',
    extra_notes: 'Available during daytime',
  },
  {
    priority: 'option_2' as const,
    full_name: 'Family Friend',
    mobile_1: '255712000222',
    relation_type: 'Friend' as const,
    extra_notes: 'Neighbour, 10 minutes away',
  },
];

const employment = (
  employment_type: string,
  employer: Record<string, unknown>,
  supervisor: Record<string, unknown>,
) => ({
  employment_type: employment_type as typeof schema.employmentTypeEnum.enumValues[number],
  is_locked: employment_type === 'Not_Working',
  employer,
  supervisor,
});

const companyEmployer = (name: string, position: string) => ({
  employer_name: name,
  position_lov: position,
  region: 'Dar es Salaam',
  district: 'Ilala',
  ward: 'Upanga',
  extra_notes: 'Employed full-time',
  office_contacts: '255700000999',
});

const supervisorRow = (name: string) => ({
  supervisor_name: name,
  supervisor_contacts_1: '255713000333',
  close_friend_name: 'Close Work Friend',
  close_friend_contacts: '255714000444',
  extra_notes: 'Reports to line manager',
});

async function upsertAccount(
  username: string,
  values: {
    account_type: typeof schema.accountTypeEnum.enumValues[number];
    role: typeof schema.roleEnum.enumValues[number];
    mobile: string;
    is_reseller: boolean;
    never_expires: boolean;
    parent_account_id?: string | null;
  },
) {
  const passwordHash = await ensurePasswordHash();
  const existing = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.username, username),
  });

  if (existing) {
    await db
      .update(schema.accounts)
      .set({ password_hash: passwordHash, status: 'active', first_login_at: new Date() })
      .where(eq(schema.accounts.id, existing.id));
    await upsertProfileStatus(existing.id);
    return existing;
  }

  const [acc] = await db
    .insert(schema.accounts)
    .values({
      account_type: values.account_type,
      role: values.role,
      profile_id: `TID-DEMO-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      username,
      password_hash: passwordHash,
      mobile_number: values.mobile,
      status: 'active',
      is_reseller: values.is_reseller,
      never_expires: values.never_expires,
      parent_account_id: values.parent_account_id ?? null,
      first_login_at: new Date(),
    })
    .returning();

  await upsertProfileStatus(acc.id);
  return acc;
}

async function upsertProfileStatus(accountId: string) {
  const existing = await db.query.profileStatus.findFirst({
    where: (t, { eq }) => eq(t.account_id, accountId),
  });
  if (existing) {
    await db
      .update(schema.profileStatus)
      .set({ status: 'active', expire_date: YEARS_FROM_NOW(1) })
      .where(eq(schema.profileStatus.id, existing.id));
    return;
  }
  await db.insert(schema.profileStatus).values({
    account_id: accountId,
    paid_amount: '12000.00',
    paid_date: new Date(),
    expire_date: YEARS_FROM_NOW(1),
    renew_date: YEARS_FROM_NOW(1),
    status: 'active',
  });
}

async function addPerson(
  ownerAccountId: string,
  member_type: string,
  data: {
    first_name: string;
    last_name: string;
    gender: 'Male' | 'Female';
    birthdate: string;
    nationality?: 'Tanzanian' | 'Foreign';
    nida_number?: string;
    fluent_language?: string;
    profile_code?: string;
    common_name?: string;
  },
) {
  const [p] = await db
    .insert(schema.personProfiles)
    .values({
      owner_account_id: ownerAccountId,
      member_type: member_type as typeof schema.memberTypeEnum.enumValues[number],
      profile_code: data.profile_code ?? null,
      common_name: data.common_name ?? null,
      first_name: data.first_name,
      last_name: data.last_name,
      gender: data.gender,
      birthdate: new Date(data.birthdate),
      nationality: data.nationality ?? 'Tanzanian',
      nida_number: (data.nationality ?? 'Tanzanian') === 'Tanzanian' ? (data.nida_number ?? null) : null,
      passport_number: (data.nationality ?? 'Tanzanian') === 'Foreign' ? 'P202512345' : null,
      fluent_language: data.fluent_language ?? 'Swahili',
    })
    .returning();
  return p;
}

async function addSubForms(
  profileId: string,
  opts: {
    mobile?: { number: string; is_primary?: boolean }[];
    health?: { blood_group: string; height: string; weight: string };
    residence?: ReturnType<typeof residence>;
    desperate?: ReturnType<typeof desperateConditions>;
    emergency?: ReturnType<typeof emergencyContacts>;
    employment?: ReturnType<typeof employment>;
  },
) {
  if (opts.mobile?.length) {
    await db.insert(schema.mobileNumbers).values(
      opts.mobile.map((m, i) => ({ person_profile_id: profileId, ...m, is_primary: i === 0 })),
    );
  }
  if (opts.health) {
    await db.insert(schema.basicHealthDetails).values({ person_profile_id: profileId, ...opts.health });
  }
  if (opts.residence) {
    await db.insert(schema.residences).values({ person_profile_id: profileId, ...opts.residence });
  }
  if (opts.desperate?.length) {
    await db.insert(schema.desperateConditions).values(
      opts.desperate.map((c) => ({ person_profile_id: profileId, ...c })),
    );
  }
  if (opts.emergency?.length) {
    await db.insert(schema.emergencyContacts).values(
      opts.emergency.map((c) => ({ person_profile_id: profileId, ...c })),
    );
  }
  if (opts.employment) {
    const [emp] = await db
      .insert(schema.employmentDetails)
      .values({
        person_profile_id: profileId,
        employment_type: opts.employment.employment_type,
        is_locked: opts.employment.is_locked,
      })
      .returning();
    if (opts.employment.employer) {
      await db.insert(schema.employers).values({ employment_detail_id: emp.id, ...opts.employment.employer });
    }
    if (opts.employment.supervisor) {
      await db.insert(schema.supervisors).values({ employment_detail_id: emp.id, ...opts.employment.supervisor });
    }
  }
}

async function addPayment(accountId: string, amount: string, months: number) {
  const existing = await db.query.payments.findFirst({
    where: (t, { and, eq }) => and(eq(t.account_id, accountId), eq(t.status, 'success')),
  });
  if (existing) return;
  await db.insert(schema.payments).values({
    account_id: accountId,
    amount,
    currency: 'TZS',
    method: 'mobile_wallet',
    provider_reference: `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    duration_months: months,
    status: 'success',
    activated_by: 'auto',
  });
}

async function addPrintableCard(accountId: string) {
  await db.insert(schema.printableCards).values({
    account_id: accountId,
    included_fields: ['first_name', 'last_name', 'blood_group', 'region', 'district'],
    qr_code_url: null,
  });
}

async function seedIndividual() {
  const acc = await upsertAccount('demo.individual', {
    account_type: 'individual',
    role: 'individual',
    mobile: '255710000001',
    is_reseller: false,
    never_expires: false,
  });

  const self = await addPerson(acc.id, 'self', {
    first_name: 'Juma',
    last_name: 'Mwinyi',
    gender: 'Male',
    birthdate: '1990-05-12',
    nida_number: '19900512001520012345',
    profile_code: acc.profile_id,
  });

  await addSubForms(self.id, {
    mobile: mobileNumbers('255710000001'),
    health: health('O+', '175 cm', '70 kg'),
    residence: residence('Dar es Salaam', 'Kinondoni', 'Mikocheni', 'Mwai Kibaki Road'),
    desperate: desperateConditions(),
    emergency: emergencyContacts('Halima Mwinyi', '255713000111', 'Wife'),
    employment: employment('Company', companyEmployer('NMB Bank', 'Manager'), supervisorRow('Sarah K')),
  });

  await addPayment(acc.id, '12000', 12);
  await addPrintableCard(acc.id);
  return acc;
}

async function seedFamily() {
  const acc = await upsertAccount('demo.family', {
    account_type: 'family',
    role: 'admin',
    mobile: '255710000002',
    is_reseller: true,
    never_expires: true,
  });

  await addPerson(acc.id, 'self', {
    first_name: 'Amina',
    last_name: 'Hassan',
    gender: 'Female',
    birthdate: '1978-02-20',
    nida_number: '19780220002831123456',
    profile_code: acc.profile_id,
  });

  const [family] = await db
    .insert(schema.families)
    .values({
      account_id: acc.id,
      family_name: 'Hassan Family',
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Mikocheni',
      street: 'Ali Hassan Mwinyi Road',
      extra_physical_details: 'House 21, yellow painted wall',
      emergency_contact_1: '255713000111',
      emergency_contact_2: '255714000222',
      neighborhood_friend_name: 'Mama Doto',
      neighborhood_friend_contacts: '255715000333',
    })
    .returning();

  await db.insert(schema.familyDoctors).values({
    family_id: family.id,
    hospital_name: 'Amana Hospital',
    region: 'Dar es Salaam',
    district: 'Ilala',
    hospital_contacts: '255222150001',
    doctor_name: 'Dr. Juma',
    doctor_contacts: '255755000222',
  });

  const adult = await addPerson(acc.id, 'adult', {
    first_name: 'Salim',
    last_name: 'Hassan',
    gender: 'Male',
    birthdate: '1972-09-14',
    nida_number: '19720914001234567890',
  });
  await addSubForms(adult.id, {
    mobile: mobileNumbers('255711000002'),
    health: health('A+', '180 cm', '78 kg'),
    residence: residence('Dar es Salaam', 'Kinondoni', 'Mikocheni'),
    emergency: emergencyContacts('Amina Hassan', '255710000002', 'Wife'),
    employment: employment('Self_Employed', companyEmployer('Hassan Enterprises', 'Director'), supervisorRow('N/A')),
  });
  await db.insert(schema.familyMembers).values({
    family_id: family.id,
    person_profile_id: adult.id,
    member_role: 'adult',
  });

  const child = await addPerson(acc.id, 'underage', {
    first_name: 'Zainab',
    last_name: 'Hassan',
    gender: 'Female',
    birthdate: '2012-04-03',
  });
  await addSubForms(child.id, {
    mobile: mobileNumbers('255711000003'),
    health: health('B+', '145 cm', '38 kg'),
    residence: residence('Dar es Salaam', 'Kinondoni', 'Mikocheni'),
    emergency: emergencyContacts('Amina Hassan', '255710000002', 'Mother'),
  });
  await db.insert(schema.underageSchoolDetails).values({
    person_profile_id: child.id,
    school_name: 'Mikocheni Primary School',
    school_lov: 'III',
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    ward: 'Mikocheni',
    school_contacts: '255222700001',
  });
  await db.insert(schema.familyMembers).values({
    family_id: family.id,
    person_profile_id: child.id,
    member_role: 'underage',
  });

  await addPayment(acc.id, '12000', 12);
  await addPrintableCard(acc.id);
  return acc;
}

async function seedSchool() {
  const acc = await upsertAccount('demo.school', {
    account_type: 'school',
    role: 'admin',
    mobile: '255710000003',
    is_reseller: true,
    never_expires: true,
  });

  await addPerson(acc.id, 'self', {
    first_name: 'John',
    last_name: 'Mrema',
    gender: 'Male',
    birthdate: '1985-07-30',
    nida_number: '19850730003561122334',
    profile_code: acc.profile_id,
  });

  const [school] = await db
    .insert(schema.schools)
    .values({
      account_id: acc.id,
      school_name: 'Green Valley Secondary School',
      registration_number: 'SEC/2021/0045',
      ownership: 'private',
      region: 'Arusha',
      district: 'Arusha City',
      ward: 'Sokoni',
      school_contacts: '255272500000',
      manager_contacts: '255755000333',
      extra_notes: 'Co-ed day and boarding school',
    })
    .returning();

  const student = await addPerson(acc.id, 'student', {
    first_name: 'Neema',
    last_name: 'Mrema',
    gender: 'Female',
    birthdate: '2010-11-18',
  });
  await addSubForms(student.id, {
    mobile: mobileNumbers('255711000004'),
    health: health('O-', '150 cm', '42 kg'),
    residence: residence('Arusha', 'Arusha City', 'Sokoni'),
    desperate: desperateConditions(),
    emergency: emergencyContacts('John Mrema', '255710000003', 'Father'),
  });
  await db.insert(schema.underageSchoolDetails).values({
    person_profile_id: student.id,
    school_name: 'Green Valley Secondary School',
    school_lov: 'I',
    region: 'Arusha',
    district: 'Arusha City',
    ward: 'Sokoni',
    school_contacts: '255272500000',
  });
  await db.insert(schema.schoolMembers).values({
    school_id: school.id,
    person_profile_id: student.id,
    beneficiary_type: 'student',
    stream_lov: 'I',
  });

  const teacher = await addPerson(acc.id, 'employee', {
    first_name: 'Peter',
    last_name: 'Mrema',
    gender: 'Male',
    birthdate: '1988-01-25',
    nida_number: '19880125004012233445',
  });
  await addSubForms(teacher.id, {
    mobile: mobileNumbers('255711000005'),
    health: health('AB+', '178 cm', '75 kg'),
    residence: residence('Arusha', 'Arusha City', 'Sokoni'),
    emergency: emergencyContacts('John Mrema', '255710000003', 'Next_of_Kin'),
    employment: employment('Government', companyEmployer('Green Valley Secondary School', 'Teacher'), supervisorRow('Head of Department')),
  });
  await db.insert(schema.schoolMembers).values({
    school_id: school.id,
    person_profile_id: teacher.id,
    beneficiary_type: 'employee',
  });

  return acc;
}

async function seedBusiness() {
  const acc = await upsertAccount('demo.business', {
    account_type: 'business',
    role: 'admin',
    mobile: '255710000004',
    is_reseller: true,
    never_expires: true,
  });

  await addPerson(acc.id, 'self', {
    first_name: 'Mariam',
    last_name: 'Komba',
    gender: 'Female',
    birthdate: '1992-12-05',
    nida_number: '19921205005021112233',
    profile_code: acc.profile_id,
  });

  const [business] = await db
    .insert(schema.businesses)
    .values({
      account_id: acc.id,
      business_name: 'Kilimanjaro Coffee Traders',
      dealership: 'Coffee export and retail',
      tin_number: '123-456-789',
      region: 'Kilimanjaro',
      district: 'Moshi',
      ward: 'Njoro',
      business_contacts: '255272700000',
      manager_contacts: '255755000444',
      extra_notes: 'Family-owned coffee business',
    })
    .returning();

  const employees = [
    {
      first_name: 'Joseph',
      last_name: 'Komba',
      birthdate: '1994-03-22',
      nida: '19940322005512233445',
      mobile: '255711000006',
      employment: employment('Company', companyEmployer('Kilimanjaro Coffee Traders', 'Officer'), supervisorRow('Mariam Komba')),
    },
    {
      first_name: 'Grace',
      last_name: 'Shayo',
      birthdate: '1997-08-09',
      nida: '19970809006013344556',
      mobile: '255711000007',
      employment: employment('Company', companyEmployer('Kilimanjaro Coffee Traders', 'Engineer'), supervisorRow('Mariam Komba')),
    },
  ];

  for (const e of employees) {
    const p = await addPerson(acc.id, 'employee', {
      first_name: e.first_name,
      last_name: e.last_name,
      gender: e.first_name === 'Joseph' ? 'Male' : 'Female',
      birthdate: e.birthdate,
      nida_number: e.nida,
    });
    await addSubForms(p.id, {
      mobile: mobileNumbers(e.mobile),
      health: health('O+', '172 cm', '68 kg'),
      residence: residence('Kilimanjaro', 'Moshi', 'Njoro'),
      emergency: emergencyContacts('Mariam Komba', '255710000004', 'Employer'),
      employment: e.employment,
    });
    await db.insert(schema.businessMembers).values({
      business_id: business.id,
      person_profile_id: p.id,
    });
  }

  await addPayment(acc.id, '12000', 12);
  return acc;
}

async function seedInstitution() {
  const acc = await upsertAccount('demo.institution', {
    account_type: 'institution',
    role: 'admin',
    mobile: '255710000005',
    is_reseller: true,
    never_expires: true,
  });

  await addPerson(acc.id, 'self', {
    first_name: 'Godfrey',
    last_name: 'Luoga',
    gender: 'Male',
    birthdate: '1975-06-14',
    nida_number: '19750614007012233445',
    profile_code: acc.profile_id,
  });

  const [institution] = await db
    .insert(schema.institutions)
    .values({
      account_id: acc.id,
      institution_name: 'University of Dodoma',
      dealership: 'Higher education',
      tin_number: '987-654-321',
      region: 'Dodoma',
      district: 'Dodoma City',
      ward: 'Chinangali',
      institution_contacts: '255262300000',
      manager_contacts: '255755000555',
      extra_notes: 'Public university',
    })
    .returning();

  const employees = [
    {
      first_name: 'Esther',
      last_name: 'Luoga',
      birthdate: '1989-02-11',
      nida: '19890211008014455667',
      mobile: '255711000008',
      employment: employment('Government', companyEmployer('University of Dodoma', 'Lecturer'), supervisorRow('Dr. Godfrey Luoga')),
    },
    {
      first_name: 'Baraka',
      last_name: 'Msigwa',
      birthdate: '1996-10-30',
      nida: '19961030009015566778',
      mobile: '255711000009',
      employment: employment('Government', companyEmployer('University of Dodoma', 'Nurse'), supervisorRow('Esther Luoga')),
    },
  ];

  for (const e of employees) {
    const p = await addPerson(acc.id, 'employee', {
      first_name: e.first_name,
      last_name: e.last_name,
      gender: e.first_name === 'Esther' ? 'Female' : 'Male',
      birthdate: e.birthdate,
      nida_number: e.nida,
    });
    await addSubForms(p.id, {
      mobile: mobileNumbers(e.mobile),
      health: health('A-', '168 cm', '62 kg'),
      residence: residence('Dodoma', 'Dodoma City', 'Chinangali'),
      emergency: emergencyContacts('Dr. Godfrey Luoga', '255710000005', 'Employer'),
      employment: e.employment,
    });
    await db.insert(schema.institutionMembers).values({
      institution_id: institution.id,
      person_profile_id: p.id,
    });
  }

  return acc;
}

async function seedSubAccounts() {
  const parents: { username: string; mobile: string; name: string }[] = [
    { username: 'demo.family', mobile: '255710000002', name: 'Salma Hassan' },
    { username: 'demo.school', mobile: '255710000003', name: 'Amani Mrema' },
    { username: 'demo.business', mobile: '255710000004', name: 'Joyce Komba' },
    { username: 'demo.institution', mobile: '255710000005', name: 'David Luoga' },
  ];

  for (let i = 0; i < parents.length; i++) {
    const parent = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.username, parents[i].username),
    });
    if (!parent) continue;

    const username = `member.${parents[i].username.replace('demo.', '')}`;
    const existing = await db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.username, username),
    });
    if (existing) continue;

    const [first, last] = parents[i].name.split(' ');
    const [acc] = await db
      .insert(schema.accounts)
      .values({
        account_type: parent.account_type,
        role: 'user',
        profile_id: `TID-DEMO-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
        username,
        password_hash: await ensurePasswordHash(),
        mobile_number: `25571100001${i}`,
        status: 'active',
        is_reseller: false,
        never_expires: false,
        parent_account_id: parent.id,
        first_login_at: new Date(),
      })
      .returning();

    await addPerson(acc.id, 'self', {
      first_name: first,
      last_name: last,
      gender: 'Female',
      birthdate: `1995-0${i + 1}-0${i + 1}`,
      nida_number: `19950${i + 1}0${i + 1}001166778899`,
    });

    await db.insert(schema.profileStatus).values({
      account_id: acc.id,
      paid_amount: '12000.00',
      paid_date: new Date(),
      expire_date: YEARS_FROM_NOW(1),
      renew_date: YEARS_FROM_NOW(1),
      status: 'active',
    });
  }
}

async function main() {
  console.log('Seeding demo accounts...');
  await deleteDemoData();

  await upsertAccount('demo.systemadmin', {
    account_type: 'individual',
    role: 'system_admin',
    mobile: '255700000000',
    is_reseller: false,
    never_expires: true,
  });

  await seedIndividual();
  await seedFamily();
  await seedSchool();
  await seedBusiness();
  await seedInstitution();
  await seedSubAccounts();

  const accounts = await db.query.accounts.findMany({
    where: (t, { inArray }) =>
      inArray(t.username, [
        'demo.systemadmin',
        'demo.individual',
        'demo.family',
        'demo.school',
        'demo.business',
        'demo.institution',
        'member.family',
        'member.school',
        'member.business',
        'member.institution',
      ]),
    orderBy: (t, { asc }) => [asc(t.username)],
  });

  console.log('\nDemo accounts ready (all share the same password):');
  console.log(`  Password: ${PASSWORD}\n`);
  for (const a of accounts) {
    console.log(`  ${a.username.padEnd(20)} role=${a.role.padEnd(12)} type=${a.account_type.padEnd(10)} profile=${a.profile_id}`);
  }
  console.log(`\nTotal demo accounts: ${accounts.length}`);
  await pool.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
