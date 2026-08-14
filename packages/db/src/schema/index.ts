import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, jsonb, uniqueIndex, index, primaryKey, pgEnum, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const accountTypeEnum = pgEnum('account_type', ['individual', 'family', 'school', 'business', 'institution']);
export const roleEnum = pgEnum('role', ['individual', 'admin', 'user', 'system_admin']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'inactive', 'locked', 'expired']);
export const memberTypeEnum = pgEnum('member_type', ['self', 'adult', 'underage', 'student', 'employee']);
export const priorityEnum = pgEnum('priority', ['prime', 'option_2', 'option_3']);
export const relationTypeEnum = pgEnum('relation_type', ['Mother', 'Father', 'Son', 'Daughter', 'Husband', 'Wife', 'Guardian', 'Grandfather', 'Grandmother', 'Next_of_Kin', 'Employer', 'Friend']);
export const purposeEnum = pgEnum('purpose', ['first_login', 'password_reset']);
export const paymentMethodEnum = pgEnum('payment_method', ['mobile_wallet', 'bank']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed']);
export const beneficiaryTypeEnum = pgEnum('beneficiary_type', ['student', 'employee']);
export const ownershipEnum = pgEnum('ownership', ['private', 'government', 'religious']);
export const smsTypeEnum = pgEnum('sms_type', ['otp', 'reminder', 'alert']);
export const memberRoleEnum = pgEnum('member_role', ['adult', 'underage']);
export const visibilityFlagEnum = pgEnum('visibility_flag', ['none', 'PU', 'P', 'PU_P']);
export const profileStatusEnum = pgEnum('profile_status_value', ['active', 'expired']);
export const genderEnum = pgEnum('gender', ['Male', 'Female']);
export const nationalityEnum = pgEnum('nationality', ['Tanzanian', 'Foreign']);
export const employmentTypeEnum = pgEnum('employment_type', ['Government', 'Foreign_Government', 'Foreign_Agency', 'Company', 'Cooperate', 'Self_Employed', 'Not_Working']);

const timestamps = {
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

const softDelete = { deleted_at: timestamp('deleted_at', { withTimezone: true }) };

// ============================================================
// Core / Identity
// ============================================================

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_type: accountTypeEnum('account_type').notNull(),
  role: roleEnum('role').notNull(),
  profile_id: varchar('profile_id', { length: 32 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  mobile_number: varchar('mobile_number', { length: 15 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  status: accountStatusEnum('status').notNull().default('inactive'),
  is_reseller: boolean('is_reseller').notNull().default(false),
  never_expires: boolean('never_expires').notNull().default(false),
  parent_account_id: uuid('parent_account_id'),
  first_login_at: timestamp('first_login_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete,
}, (t) => [
  index('accounts_profile_id_idx').on(t.profile_id),
  index('accounts_mobile_idx').on(t.mobile_number),
  foreignKey({ columns: [t.parent_account_id], foreignColumns: [t.id] }),
]);

export const authCodes = pgTable('auth_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  otp_code: varchar('otp_code', { length: 6 }).notNull(),
  purpose: purposeEnum('purpose').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  used_at: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('auth_codes_account_idx').on(t.account_id)]);

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  refresh_token: text('refresh_token').notNull(),
  device: varchar('device', { length: 255 }),
  ip: varchar('ip', { length: 64 }),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('sessions_account_idx').on(t.account_id), index('sessions_refresh_idx').on(t.refresh_token)]);

// ============================================================
// Profile content (shared polymorphic owner)
// ============================================================

export const personProfiles = pgTable('person_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner_account_id: uuid('owner_account_id').notNull().references(() => accounts.id),
  member_type: memberTypeEnum('member_type').notNull(),
  common_name: varchar('common_name', { length: 100 }),
  profile_code: varchar('profile_code', { length: 64 }).unique(),
  pic_url: text('pic_url'),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  middle_name: varchar('middle_name', { length: 100 }),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  gender: genderEnum('gender').notNull(),
  birthdate: timestamp('birthdate', { withTimezone: true }).notNull(),
  nationality: nationalityEnum('nationality').notNull(),
  nida_number: varchar('nida_number', { length: 30 }),
  passport_number: varchar('passport_number', { length: 30 }),
  fluent_language: varchar('fluent_language', { length: 100 }),
  ...timestamps,
  ...softDelete,
}, (t) => [
  index('person_profiles_owner_idx').on(t.owner_account_id),
  index('person_profiles_code_idx').on(t.profile_code),
]);

export const mobileNumbers = pgTable('mobile_numbers', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  number: varchar('number', { length: 15 }).notNull(),
  is_primary: boolean('is_primary').notNull().default(true),
  ...timestamps,
});

export const basicHealthDetails = pgTable('basic_health_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  blood_group: varchar('blood_group', { length: 10 }),
  height: varchar('height', { length: 20 }),
  weight: varchar('weight', { length: 20 }),
  ...timestamps,
});

export const residences = pgTable('residences', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  street: varchar('street', { length: 200 }),
  extra_physical_details: text('extra_physical_details'),
  neighborhood_friend_name: varchar('neighborhood_friend_name', { length: 150 }),
  neighborhood_friend_contacts: varchar('neighborhood_friend_contacts', { length: 200 }),
  ...timestamps,
});

export const desperateConditions = pgTable('desperate_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  acute_condition_code: varchar('acute_condition_code', { length: 100 }),
  notes: text('notes'),
  occurrence: text('occurrence'),
  unconscious_treatment_remedy: text('unconscious_treatment_remedy'),
  treatment_hospital: varchar('treatment_hospital', { length: 200 }),
  hospital_region: varchar('hospital_region', { length: 100 }),
  hospital_district: varchar('hospital_district', { length: 100 }),
  hospital_contacts: varchar('hospital_contacts', { length: 200 }),
  doctor_name: varchar('doctor_name', { length: 150 }),
  doctor_contacts: varchar('doctor_contacts', { length: 200 }),
  ...timestamps,
});

export const emergencyContacts = pgTable('emergency_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  priority: priorityEnum('priority').notNull(),
  full_name: varchar('full_name', { length: 150 }).notNull(),
  mobile_1: varchar('mobile_1', { length: 15 }),
  mobile_2: varchar('mobile_2', { length: 15 }),
  alt_number_1: varchar('alt_number_1', { length: 15 }),
  alt_number_2: varchar('alt_number_2', { length: 15 }),
  relation_type: relationTypeEnum('relation_type'),
  residence_details: text('residence_details'),
  fluent_language: varchar('fluent_language', { length: 100 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  extra_notes: text('extra_notes'),
  ...timestamps,
}, (t) => [index('emergency_contacts_profile_idx').on(t.person_profile_id)]);

export const employmentDetails = pgTable('employment_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  employment_type: employmentTypeEnum('employment_type').notNull(),
  is_locked: boolean('is_locked').notNull().default(false),
  ...timestamps,
});

export const employers = pgTable('employers', {
  id: uuid('id').primaryKey().defaultRandom(),
  employment_detail_id: uuid('employment_detail_id').notNull().references(() => employmentDetails.id),
  employer_name: varchar('employer_name', { length: 200 }),
  employer_logo_url: varchar('employer_logo_url', { length: 500 }),
  position_lov: varchar('position_lov', { length: 100 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  extra_notes: text('extra_notes'),
  office_contacts: varchar('office_contacts', { length: 200 }),
  ...timestamps,
});

export const supervisors = pgTable('supervisors', {
  id: uuid('id').primaryKey().defaultRandom(),
  employment_detail_id: uuid('employment_detail_id').notNull().references(() => employmentDetails.id),
  supervisor_name: varchar('supervisor_name', { length: 150 }),
  supervisor_contacts_1: varchar('supervisor_contacts_1', { length: 200 }),
  supervisor_contacts_2: varchar('supervisor_contacts_2', { length: 200 }),
  close_friend_name: varchar('close_friend_name', { length: 150 }),
  close_friend_contacts: varchar('close_friend_contacts', { length: 200 }),
  extra_notes: text('extra_notes'),
  ...timestamps,
});

// ============================================================
// Account-type-specific
// ============================================================

export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  family_name: varchar('family_name', { length: 200 }).notNull(),
  family_pic_url: varchar('family_pic_url', { length: 500 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  street: varchar('street', { length: 200 }),
  extra_physical_details: text('extra_physical_details'),
  emergency_contact_1: varchar('emergency_contact_1', { length: 200 }),
  emergency_contact_2: varchar('emergency_contact_2', { length: 200 }),
  neighborhood_friend_name: varchar('neighborhood_friend_name', { length: 150 }),
  neighborhood_friend_contacts: varchar('neighborhood_friend_contacts', { length: 200 }),
  ...timestamps,
});

export const familyDoctors = pgTable('family_doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  family_id: uuid('family_id').notNull().references(() => families.id),
  hospital_name: varchar('hospital_name', { length: 200 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  hospital_contacts: varchar('hospital_contacts', { length: 200 }),
  doctor_name: varchar('doctor_name', { length: 150 }),
  doctor_contacts: varchar('doctor_contacts', { length: 200 }),
  ...timestamps,
});

export const familyLinks = pgTable('family_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  family_id: uuid('family_id').notNull().references(() => families.id),
  linking_code: varchar('linking_code', { length: 32 }).notNull(),
  linked_person_profile_id: uuid('linked_person_profile_id').references(() => personProfiles.id),
  linked_scheme: varchar('linked_scheme', { length: 50 }),
  ...timestamps,
});

export const familyMembers = pgTable('family_members', {
  family_id: uuid('family_id').notNull().references(() => families.id),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  member_role: memberRoleEnum('member_role').notNull(),
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.family_id, t.person_profile_id] })]);

export const underageSchoolDetails = pgTable('underage_school_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  school_name: varchar('school_name', { length: 200 }),
  school_logo_url: varchar('school_logo_url', { length: 500 }),
  school_lov: varchar('school_lov', { length: 50 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  extra_notes: text('extra_notes'),
  school_contacts: varchar('school_contacts', { length: 200 }),
  ...timestamps,
});

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  school_name: varchar('school_name', { length: 200 }).notNull(),
  registration_number: varchar('registration_number', { length: 100 }),
  ownership: ownershipEnum('ownership'),
  school_logo_url: varchar('school_logo_url', { length: 500 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  extra_notes: text('extra_notes'),
  school_contacts: varchar('school_contacts', { length: 200 }),
  manager_contacts: varchar('manager_contacts', { length: 200 }),
  ...timestamps,
});

export const schoolMembers = pgTable('school_members', {
  school_id: uuid('school_id').notNull().references(() => schools.id),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  beneficiary_type: beneficiaryTypeEnum('beneficiary_type').notNull(),
  stream_lov: varchar('stream_lov', { length: 50 }),
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.school_id, t.person_profile_id] })]);

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  business_name: varchar('business_name', { length: 200 }).notNull(),
  dealership: varchar('dealership', { length: 200 }),
  tin_number: varchar('tin_number', { length: 100 }),
  business_logo_url: varchar('business_logo_url', { length: 500 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  extra_notes: text('extra_notes'),
  business_contacts: varchar('business_contacts', { length: 200 }),
  manager_contacts: varchar('manager_contacts', { length: 200 }),
  ...timestamps,
});

export const businessMembers = pgTable('business_members', {
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.business_id, t.person_profile_id] })]);

export const institutions = pgTable('institutions', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  institution_name: varchar('institution_name', { length: 200 }).notNull(),
  dealership: varchar('dealership', { length: 200 }),
  tin_number: varchar('tin_number', { length: 100 }),
  institution_logo_url: varchar('institution_logo_url', { length: 500 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  local_authority_name: varchar('local_authority_name', { length: 150 }),
  extra_notes: text('extra_notes'),
  institution_contacts: varchar('institution_contacts', { length: 200 }),
  manager_contacts: varchar('manager_contacts', { length: 200 }),
  ...timestamps,
});

export const institutionMembers = pgTable('institution_members', {
  institution_id: uuid('institution_id').notNull().references(() => institutions.id),
  person_profile_id: uuid('person_profile_id').notNull().references(() => personProfiles.id),
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.institution_id, t.person_profile_id] })]);

// ============================================================
// Profile status / payments
// ============================================================

export const profileStatus = pgTable('profile_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  paid_amount: numeric('paid_amount', { precision: 12, scale: 2 }),
  paid_date: timestamp('paid_date', { withTimezone: true }),
  expire_date: timestamp('expire_date', { withTimezone: true }),
  renew_date: timestamp('renew_date', { withTimezone: true }),
  status: profileStatusEnum('status').notNull().default('expired'),
  ...timestamps,
}, (t) => [index('profile_status_account_idx').on(t.account_id)]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('TZS'),
  method: paymentMethodEnum('method').notNull(),
  provider_reference: varchar('provider_reference', { length: 255 }),
  duration_months: integer('duration_months').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  activated_by: varchar('activated_by', { length: 50 }).default('auto'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('payments_account_idx').on(t.account_id), index('payments_provider_idx').on(t.provider_reference)]);

// ============================================================
// Visibility & printing
// ============================================================

export const fieldVisibility = pgTable('field_visibility', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_type: accountTypeEnum('account_type').notNull(),
  entity_name: varchar('entity_name', { length: 100 }).notNull(),
  field_name: varchar('field_name', { length: 100 }).notNull(),
  flag: visibilityFlagEnum('flag').notNull().default('none'),
  ...timestamps,
}, (t) => [uniqueIndex('field_visibility_uniq').on(t.account_type, t.entity_name, t.field_name)]);

export const fieldVisibilityOverrides = pgTable('field_visibility_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  field_visibility_id: uuid('field_visibility_id').notNull().references(() => fieldVisibility.id),
  is_public: boolean('is_public').notNull().default(true),
  ...timestamps,
}, (t) => [uniqueIndex('visibility_override_uniq').on(t.account_id, t.field_visibility_id)]);

export const printableCards = pgTable('printable_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id),
  included_fields: jsonb('included_fields').$type<string[]>().notNull().default([]),
  qr_code_url: varchar('qr_code_url', { length: 500 }),
  generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('printable_cards_account_idx').on(t.account_id)]);

// ============================================================
// Lookups (LOV) — System-Admin editable
// ============================================================

export const lovAcuteConditions = pgTable('lov_acute_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 200 }).notNull(),
  ...timestamps,
});

export const lovEmploymentTypes = pgTable('lov_employment_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 200 }).notNull(),
  ...timestamps,
});

export const lovPositions = pgTable('lov_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 200 }).notNull(),
  ...timestamps,
});

export const lovSchoolStreams = pgTable('lov_school_streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 200 }).notNull(),
  ...timestamps,
});

export const lovOwnershipTypes = pgTable('lov_ownership_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 200 }).notNull(),
  ...timestamps,
});

// ============================================================
// System admin / audit
// ============================================================

export const systemAdminLogs = pgTable('system_admin_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actor_account_id: uuid('actor_account_id').references(() => accounts.id),
  action: varchar('action', { length: 100 }).notNull(),
  target_account_id: uuid('target_account_id').references(() => accounts.id),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const urlAccessLogs = pgTable('url_access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').references(() => accounts.id),
  url: varchar('url', { length: 500 }).notNull(),
  ip: varchar('ip', { length: 64 }),
  user_agent: varchar('user_agent', { length: 500 }),
  accessed_at: timestamp('accessed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('url_access_logs_account_idx').on(t.account_id)]);

export const smsLogs = pgTable('sms_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').references(() => accounts.id),
  type: smsTypeEnum('type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// Relations
// ============================================================

export const accountsRelations = relations(accounts, ({ many, one }) => ({
  subAccounts: many(accounts, { relationName: 'parent_sub' }),
  parentAccount: one(accounts, { fields: [accounts.parent_account_id], references: [accounts.id], relationName: 'parent_sub' }),
  authCodes: many(authCodes),
  sessions: many(sessions),
  personProfiles: many(personProfiles),
  payments: many(payments),
  profileStatus: one(profileStatus, { fields: [accounts.id], references: [profileStatus.account_id] }),
  printableCards: many(printableCards),
}));

export const personProfilesRelations = relations(personProfiles, ({ one, many }) => ({
  owner: one(accounts, { fields: [personProfiles.owner_account_id], references: [accounts.id] }),
  mobileNumbers: many(mobileNumbers),
  health: one(basicHealthDetails, { fields: [personProfiles.id], references: [basicHealthDetails.person_profile_id] }),
  residence: one(residences, { fields: [personProfiles.id], references: [residences.person_profile_id] }),
  desperateConditions: many(desperateConditions),
  emergencyContacts: many(emergencyContacts),
  employment: one(employmentDetails, { fields: [personProfiles.id], references: [employmentDetails.person_profile_id] }),
}));

export const employmentRelations = relations(employmentDetails, ({ one, many }) => ({
  profile: one(personProfiles, { fields: [employmentDetails.person_profile_id], references: [personProfiles.id] }),
  employers: many(employers),
  supervisors: many(supervisors),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  account: one(accounts, { fields: [payments.account_id], references: [accounts.id] }),
}));

export const authCodesRelations = relations(authCodes, ({ one }) => ({
  account: one(accounts, { fields: [authCodes.account_id], references: [accounts.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  account: one(accounts, { fields: [sessions.account_id], references: [accounts.id] }),
}));

export const mobileNumbersRelations = relations(mobileNumbers, ({ one }) => ({
  profile: one(personProfiles, { fields: [mobileNumbers.person_profile_id], references: [personProfiles.id] }),
}));

export const desperateConditionsRelations = relations(desperateConditions, ({ one }) => ({
  profile: one(personProfiles, { fields: [desperateConditions.person_profile_id], references: [personProfiles.id] }),
}));

export const emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
  profile: one(personProfiles, { fields: [emergencyContacts.person_profile_id], references: [personProfiles.id] }),
}));

export const employersRelations = relations(employers, ({ one }) => ({
  employmentDetail: one(employmentDetails, { fields: [employers.employment_detail_id], references: [employmentDetails.id] }),
}));

export const supervisorsRelations = relations(supervisors, ({ one }) => ({
  employmentDetail: one(employmentDetails, { fields: [supervisors.employment_detail_id], references: [employmentDetails.id] }),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
  account: one(accounts, { fields: [families.account_id], references: [accounts.id] }),
  doctors: many(familyDoctors),
  links: many(familyLinks),
}));

export const printableCardsRelations = relations(printableCards, ({ one }) => ({
  account: one(accounts, { fields: [printableCards.account_id], references: [accounts.id] }),
}));

export const familyDoctorsRelations = relations(familyDoctors, ({ one }) => ({
  family: one(families, { fields: [familyDoctors.family_id], references: [families.id] }),
}));

export const familyLinksRelations = relations(familyLinks, ({ one }) => ({
  family: one(families, { fields: [familyLinks.family_id], references: [families.id] }),
}));
