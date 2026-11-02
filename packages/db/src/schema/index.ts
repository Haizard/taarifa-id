import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, jsonb, uniqueIndex, index, primaryKey, pgEnum, foreignKey, check, date } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

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
export const serviceCategoryEnum = pgEnum('service_category', ['hospital', 'school', 'garage']);
export const serviceDeliveryEnum = pgEnum('service_delivery', ['appointment', 'on_demand', 'delivery', 'enrollment']);
export const servicePriceTypeEnum = pgEnum('service_price_type', ['fixed', 'quote_required', 'free']);
export const serviceSharingEnum = pgEnum('service_sharing', ['selected_provider', 'matching_providers']);
export const serviceRequestStatusEnum = pgEnum('service_request_status', ['open', 'offered', 'accepted', 'in_progress', 'completed', 'cancelled']);
export const serviceOfferStatusEnum = pgEnum('service_offer_status', ['pending', 'accepted', 'declined']);
export const serviceAssignmentStatusEnum = pgEnum('service_assignment_status', ['active', 'released']);
export const serviceAssignmentEventTypeEnum = pgEnum('service_assignment_event_type', ['assigned', 'released']);
export const serviceWorkerReviewStatusEnum = pgEnum('service_worker_review_status', ['active', 'disputed', 'upheld', 'removed']);
export const careerVerificationStatusEnum = pgEnum('career_verification_status', ['pending', 'verified', 'disputed', 'rejected']);

export type ServiceFormField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[];
};

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
// Service marketplace
// ============================================================

export const serviceProviders = pgTable('service_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().unique().references(() => accounts.id),
  category: serviceCategoryEnum('category').notNull(),
  display_name: varchar('display_name', { length: 200 }).notNull(),
  description: text('description'),
  contact_number: varchar('contact_number', { length: 20 }),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  accepting_requests: boolean('accepting_requests').notNull().default(true),
  ...timestamps,
}, (t) => [index('service_providers_category_idx').on(t.category)]);

export const providerServices = pgTable('provider_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider_id: uuid('provider_id').notNull().references(() => serviceProviders.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  delivery_mode: serviceDeliveryEnum('delivery_mode').notNull(),
  price_type: servicePriceTypeEnum('price_type').notNull().default('quote_required'),
  price_amount: numeric('price_amount', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 8 }).notNull().default('TZS'),
  estimated_minutes: integer('estimated_minutes'),
  form_fields: jsonb('form_fields').$type<ServiceFormField[]>().notNull().default([]),
  is_active: boolean('is_active').notNull().default(true),
  ...timestamps,
}, (t) => [index('provider_services_provider_idx').on(t.provider_id)]);

export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  requester_account_id: uuid('requester_account_id').notNull().references(() => accounts.id),
  requester_profile_id: uuid('requester_profile_id').references(() => personProfiles.id),
  provider_service_id: uuid('provider_service_id').notNull().references(() => providerServices.id),
  sharing_scope: serviceSharingEnum('sharing_scope').notNull().default('selected_provider'),
  status: serviceRequestStatusEnum('status').notNull().default('open'),
  summary: varchar('summary', { length: 240 }),
  answers: jsonb('answers').$type<Record<string, unknown>>().notNull().default({}),
  form_snapshot: jsonb('form_snapshot').$type<ServiceFormField[]>().notNull().default([]),
  region: varchar('region', { length: 100 }),
  district: varchar('district', { length: 100 }),
  ward: varchar('ward', { length: 100 }),
  ...timestamps,
}, (t) => [
  index('service_requests_requester_idx').on(t.requester_account_id),
  index('service_requests_service_idx').on(t.provider_service_id),
  index('service_requests_status_idx').on(t.status),
]);

export const serviceOffers = pgTable('service_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  request_id: uuid('request_id').notNull().references(() => serviceRequests.id),
  provider_id: uuid('provider_id').notNull().references(() => serviceProviders.id),
  provider_service_id: uuid('provider_service_id').notNull().references(() => providerServices.id),
  price_amount: numeric('price_amount', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 8 }).notNull().default('TZS'),
  message: text('message'),
  estimated_minutes: integer('estimated_minutes'),
  status: serviceOfferStatusEnum('status').notNull().default('pending'),
  ...timestamps,
}, (t) => [index('service_offers_request_idx').on(t.request_id), index('service_offers_provider_idx').on(t.provider_id)]);

export const serviceReviews = pgTable('service_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  request_id: uuid('request_id').notNull().unique().references(() => serviceRequests.id),
  provider_id: uuid('provider_id').notNull().references(() => serviceProviders.id),
  reviewer_account_id: uuid('reviewer_account_id').notNull().references(() => accounts.id),
  rating: integer('rating').notNull(),
  review: text('review'),
  provider_response: text('provider_response'),
  provider_disputed_at: timestamp('provider_disputed_at', { withTimezone: true }),
  moderation_status: serviceWorkerReviewStatusEnum('moderation_status').notNull().default('active'),
  moderation_note: text('moderation_note'),
  moderated_by_account_id: uuid('moderated_by_account_id').references(() => accounts.id),
  moderated_at: timestamp('moderated_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('service_reviews_provider_idx').on(t.provider_id),
  check('service_reviews_rating_range', sql`${t.rating} between 1 and 5`),
]);

export const serviceAssignments = pgTable('service_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  request_id: uuid('request_id').notNull().references(() => serviceRequests.id),
  provider_id: uuid('provider_id').notNull().references(() => serviceProviders.id),
  worker_account_id: uuid('worker_account_id').notNull().references(() => accounts.id),
  assigned_by_account_id: uuid('assigned_by_account_id').notNull().references(() => accounts.id),
  status: serviceAssignmentStatusEnum('status').notNull().default('active'),
  assigned_at: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  released_at: timestamp('released_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('service_assignments_request_idx').on(t.request_id),
  index('service_assignments_provider_idx').on(t.provider_id),
  index('service_assignments_worker_idx').on(t.worker_account_id),
  uniqueIndex('service_assignments_active_unique').on(t.request_id, t.worker_account_id).where(sql`${t.status} = 'active'`),
]);

export const serviceAssignmentEvents = pgTable('service_assignment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignment_id: uuid('assignment_id').notNull().references(() => serviceAssignments.id),
  actor_account_id: uuid('actor_account_id').notNull().references(() => accounts.id),
  event_type: serviceAssignmentEventTypeEnum('event_type').notNull(),
  note: text('note'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('service_assignment_events_assignment_idx').on(t.assignment_id)]);

export const serviceWorkerReviews = pgTable('service_worker_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  request_id: uuid('request_id').notNull().references(() => serviceRequests.id),
  assignment_id: uuid('assignment_id').notNull().references(() => serviceAssignments.id),
  provider_id: uuid('provider_id').notNull().references(() => serviceProviders.id),
  worker_account_id: uuid('worker_account_id').notNull().references(() => accounts.id),
  reviewer_account_id: uuid('reviewer_account_id').notNull().references(() => accounts.id),
  rating: integer('rating').notNull(),
  review: text('review'),
  worker_response: text('worker_response'),
  worker_disputed_at: timestamp('worker_disputed_at', { withTimezone: true }),
  moderation_status: serviceWorkerReviewStatusEnum('moderation_status').notNull().default('active'),
  moderation_note: text('moderation_note'),
  moderated_by_account_id: uuid('moderated_by_account_id').references(() => accounts.id),
  moderated_at: timestamp('moderated_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex('service_worker_reviews_assignment_unique').on(t.assignment_id),
  uniqueIndex('service_worker_reviews_request_worker_unique').on(t.request_id, t.worker_account_id),
  index('service_worker_reviews_worker_idx').on(t.worker_account_id),
  index('service_worker_reviews_provider_idx').on(t.provider_id),
  check('service_worker_reviews_rating_range', sql`${t.rating} between 1 and 5`),
]);

export const careerProfiles = pgTable('career_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().unique().references(() => accounts.id),
  headline: varchar('headline', { length: 200 }),
  summary: text('summary'),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  job_seeking: boolean('job_seeking').notNull().default(false),
  job_categories: jsonb('job_categories').$type<string[]>().notNull().default([]),
  job_locations: jsonb('job_locations').$type<string[]>().notNull().default([]),
  excluded_employer_account_ids: jsonb('excluded_employer_account_ids').$type<string[]>().notNull().default([]),
  ...timestamps,
});

export const jobPostings = pgTable('job_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_account_id: uuid('organization_account_id').notNull().references(() => accounts.id),
  provider_id: uuid('provider_id').notNull().references(() => serviceProviders.id),
  title: varchar('title', { length: 180 }).notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  location: varchar('location', { length: 180 }).notNull(),
  employment_type: varchar('employment_type', { length: 40 }).notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  closes_at: timestamp('closes_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('job_postings_org_idx').on(t.organization_account_id), index('job_postings_status_idx').on(t.status)]);

export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  job_id: uuid('job_id').notNull().references(() => jobPostings.id),
  worker_account_id: uuid('worker_account_id').notNull().references(() => accounts.id),
  status: varchar('status', { length: 24 }).notNull().default('submitted'),
  cover_note: text('cover_note'),
  employer_note: text('employer_note'),
  shared_profile: boolean('shared_profile').notNull().default(false),
  shared_history_ids: jsonb('shared_history_ids').$type<string[]>().notNull().default([]),
  ...timestamps,
}, (t) => [uniqueIndex('job_applications_job_worker_unique').on(t.job_id, t.worker_account_id), index('job_applications_worker_idx').on(t.worker_account_id)]);

export const jobMessages = pgTable('job_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  application_id: uuid('application_id').notNull().references(() => jobApplications.id),
  sender_account_id: uuid('sender_account_id').notNull().references(() => accounts.id),
  body: text('body').notNull(),
  read_at: timestamp('read_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('job_messages_application_idx').on(t.application_id, t.created_at)]);

export const careerHistory = pgTable('career_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  worker_account_id: uuid('worker_account_id').notNull().references(() => accounts.id),
  organization_account_id: uuid('organization_account_id').notNull().references(() => accounts.id),
  organization_name: varchar('organization_name', { length: 200 }).notNull(),
  provider_id: uuid('provider_id').references(() => serviceProviders.id),
  position: varchar('position', { length: 150 }).notNull(),
  started_on: date('started_on').notNull(),
  ended_on: date('ended_on'),
  verification_status: careerVerificationStatusEnum('verification_status').notNull().default('pending'),
  verified_by_account_id: uuid('verified_by_account_id').references(() => accounts.id),
  worker_acknowledged_at: timestamp('worker_acknowledged_at', { withTimezone: true }),
  worker_note: text('worker_note'),
  moderation_note: text('moderation_note'),
  ...timestamps,
}, (t) => [
  index('career_history_worker_idx').on(t.worker_account_id),
  index('career_history_organization_idx').on(t.organization_account_id),
]);

export const careerShareGrants = pgTable('career_share_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: uuid('token').notNull().defaultRandom().unique(),
  worker_account_id: uuid('worker_account_id').notNull().references(() => accounts.id),
  include_profile: boolean('include_profile').notNull().default(true),
  history_record_ids: jsonb('history_record_ids').$type<string[]>().notNull().default([]),
  purpose: varchar('purpose', { length: 240 }).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('career_share_grants_worker_idx').on(t.worker_account_id)]);

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
  careerProfiles: many(careerProfiles),
  careerHistoryAsWorker: many(careerHistory, { relationName: 'career_worker' }),
  careerHistoryAsOrganization: many(careerHistory, { relationName: 'career_organization' }),
  careerHistoryVerified: many(careerHistory, { relationName: 'career_verifier' }),
  careerShareGrants: many(careerShareGrants),
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

export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  account: one(accounts, { fields: [serviceProviders.account_id], references: [accounts.id] }),
  services: many(providerServices),
  offers: many(serviceOffers),
  reviews: many(serviceReviews),
  careerHistory: many(careerHistory),
}));

export const providerServicesRelations = relations(providerServices, ({ one, many }) => ({
  provider: one(serviceProviders, { fields: [providerServices.provider_id], references: [serviceProviders.id] }),
  requests: many(serviceRequests),
  offers: many(serviceOffers),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  requester: one(accounts, { fields: [serviceRequests.requester_account_id], references: [accounts.id] }),
  requesterProfile: one(personProfiles, { fields: [serviceRequests.requester_profile_id], references: [personProfiles.id] }),
  service: one(providerServices, { fields: [serviceRequests.provider_service_id], references: [providerServices.id] }),
  offers: many(serviceOffers),
  review: one(serviceReviews),
  assignments: many(serviceAssignments),
}));

export const serviceOffersRelations = relations(serviceOffers, ({ one }) => ({
  request: one(serviceRequests, { fields: [serviceOffers.request_id], references: [serviceRequests.id] }),
  provider: one(serviceProviders, { fields: [serviceOffers.provider_id], references: [serviceProviders.id] }),
  service: one(providerServices, { fields: [serviceOffers.provider_service_id], references: [providerServices.id] }),
}));

export const serviceReviewsRelations = relations(serviceReviews, ({ one }) => ({
  request: one(serviceRequests, { fields: [serviceReviews.request_id], references: [serviceRequests.id] }),
  provider: one(serviceProviders, { fields: [serviceReviews.provider_id], references: [serviceProviders.id] }),
  reviewer: one(accounts, { fields: [serviceReviews.reviewer_account_id], references: [accounts.id] }),
}));

export const serviceAssignmentsRelations = relations(serviceAssignments, ({ one, many }) => ({
  request: one(serviceRequests, { fields: [serviceAssignments.request_id], references: [serviceRequests.id] }),
  provider: one(serviceProviders, { fields: [serviceAssignments.provider_id], references: [serviceProviders.id] }),
  worker: one(accounts, { fields: [serviceAssignments.worker_account_id], references: [accounts.id] }),
  assignedBy: one(accounts, { fields: [serviceAssignments.assigned_by_account_id], references: [accounts.id] }),
  events: many(serviceAssignmentEvents),
}));

export const serviceAssignmentEventsRelations = relations(serviceAssignmentEvents, ({ one }) => ({
  assignment: one(serviceAssignments, { fields: [serviceAssignmentEvents.assignment_id], references: [serviceAssignments.id] }),
  actor: one(accounts, { fields: [serviceAssignmentEvents.actor_account_id], references: [accounts.id] }),
}));

export const careerProfilesRelations = relations(careerProfiles, ({ one }) => ({
  account: one(accounts, { fields: [careerProfiles.account_id], references: [accounts.id] }),
}));

export const careerHistoryRelations = relations(careerHistory, ({ one }) => ({
  worker: one(accounts, { fields: [careerHistory.worker_account_id], references: [accounts.id], relationName: 'career_worker' }),
  organization: one(accounts, { fields: [careerHistory.organization_account_id], references: [accounts.id], relationName: 'career_organization' }),
  verifier: one(accounts, { fields: [careerHistory.verified_by_account_id], references: [accounts.id], relationName: 'career_verifier' }),
  provider: one(serviceProviders, { fields: [careerHistory.provider_id], references: [serviceProviders.id] }),
}));

export const careerShareGrantsRelations = relations(careerShareGrants, ({ one }) => ({
  worker: one(accounts, { fields: [careerShareGrants.worker_account_id], references: [accounts.id] }),
}));

export const serviceWorkerReviewsRelations = relations(serviceWorkerReviews, ({ one }) => ({
  request: one(serviceRequests, { fields: [serviceWorkerReviews.request_id], references: [serviceRequests.id] }),
  assignment: one(serviceAssignments, { fields: [serviceWorkerReviews.assignment_id], references: [serviceAssignments.id] }),
  provider: one(serviceProviders, { fields: [serviceWorkerReviews.provider_id], references: [serviceProviders.id] }),
  worker: one(accounts, { fields: [serviceWorkerReviews.worker_account_id], references: [accounts.id] }),
  reviewer: one(accounts, { fields: [serviceWorkerReviews.reviewer_account_id], references: [accounts.id] }),
}));
