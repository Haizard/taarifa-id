import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createPoolConfig } from './env.js';
import {
  lovAcuteConditions,
  lovEmploymentTypes,
  lovPositions,
  lovSchoolStreams,
  lovOwnershipTypes,
  fieldVisibility,
} from './schema/index.js';

const pool = new Pool(createPoolConfig());

const db = drizzle(pool);

async function seed() {
  console.log('Seeding LOV tables...');

  await db.insert(lovAcuteConditions).values([
    { code: 'heart_attack', label: 'Heart Attack' },
    { code: 'stroke', label: 'Stroke' },
    { code: 'severe_allergic_reaction', label: 'Severe Allergic Reaction' },
    { code: 'suicidal_thoughts', label: 'Suicidal Thoughts' },
    { code: 'seizures', label: 'Seizures' },
    { code: 'asthma_attack', label: 'Asthma Attack' },
    { code: 'diabetic_emergency', label: 'Diabetic Emergency' },
    { code: 'choking', label: 'Choking' },
    { code: 'severe_bleeding', label: 'Severe Bleeding' },
    { code: 'poisoning', label: 'Poisoning' },
  ]).onConflictDoNothing();

  await db.insert(lovEmploymentTypes).values([
    { code: 'government', label: 'Government' },
    { code: 'foreign_government', label: 'Foreign Government' },
    { code: 'foreign_agency', label: 'Foreign Agency' },
    { code: 'company', label: 'Company' },
    { code: 'cooperate', label: 'Cooperate' },
    { code: 'self_employed', label: 'Self Employed' },
    { code: 'not_working', label: 'Not Working' },
  ]).onConflictDoNothing();

  await db.insert(lovPositions).values([
    { code: 'manager', label: 'Manager' },
    { code: 'supervisor', label: 'Supervisor' },
    { code: 'director', label: 'Director' },
    { code: 'officer', label: 'Officer' },
    { code: 'teacher', label: 'Teacher' },
    { code: 'nurse', label: 'Nurse' },
    { code: 'engineer', label: 'Engineer' },
    { code: 'driver', label: 'Driver' },
    { code: 'laborer', label: 'Laborer' },
    { code: 'other', label: 'Other' },
  ]).onConflictDoNothing();

  await db.insert(lovSchoolStreams).values([
    { code: 'I', label: 'Standard I' },
    { code: 'II', label: 'Standard II' },
    { code: 'III', label: 'Standard III' },
    { code: 'IV', label: 'Standard IV' },
    { code: 'V', label: 'Standard V' },
    { code: 'VI', label: 'Standard VI' },
    { code: 'VII', label: 'Standard VII' },
  ]).onConflictDoNothing();

  await db.insert(lovOwnershipTypes).values([
    { code: 'private', label: 'Private' },
    { code: 'government', label: 'Government' },
    { code: 'religious', label: 'Religious' },
  ]).onConflictDoNothing();

  const individualFields = [
    ['basic_details', 'first_name', 'none'],
    ['basic_details', 'last_name', 'none'],
    ['basic_details', 'gender', 'none'],
    ['basic_details', 'birthdate', 'PU'],
    ['basic_details', 'nationality', 'PU'],
    ['basic_details', 'nida_number', 'P'],
    ['basic_details', 'passport_number', 'P'],
    ['basic_details', 'fluent_language', 'PU'],
    ['basic_health', 'blood_group', 'PU'],
    ['basic_health', 'height', 'PU'],
    ['basic_health', 'weight', 'PU'],
    ['residence', 'region', 'PU'],
    ['residence', 'district', 'PU'],
    ['residence', 'ward', 'PU'],
    ['residence', 'street', 'PU_P'],
    ['emergency_contacts', 'full_name', 'P'],
    ['emergency_contacts', 'mobile_1', 'P'],
    ['employment', 'employment_type', 'PU'],
  ] as const;

  for (const [entity, field, flag] of individualFields) {
    await db.insert(fieldVisibility).values({
      account_type: 'individual',
      entity_name: entity,
      field_name: field,
      flag,
    }).onConflictDoNothing();
  }

  console.log('Seed complete.');
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
