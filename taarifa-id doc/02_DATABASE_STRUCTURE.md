# TAARIFA_ID — Database Structure & Rules

Engine: PostgreSQL. All primary keys are UUID. All tables have `created_at`, `updated_at`
(and `deleted_at` for soft-delete where noted). Every "visibility-controlled" field is
tracked via the `field_visibility` table rather than a column-per-flag, so `PU`/`P` rules
stay editable without migrations.

## 1. Core / Identity Tables

### `accounts`
The umbrella row for every registrant, regardless of type.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_type | enum(`individual`,`family`,`school`,`business`,`institution`) | |
| role | enum(`individual`,`admin`,`user`,`system_admin`) | derived: individual→`individual`; family/school/business/institution owner→`admin`; sub-member→`user` |
| profile_id | varchar unique | system-generated, printed on card |
| username | varchar unique | |
| password_hash | varchar | |
| mobile_number | varchar unique | must start with `255` |
| email | varchar | |
| status | enum(`active`,`inactive`,`locked`,`expired`) | |
| is_reseller | boolean | true for family/school/business/institution |
| never_expires | boolean | true for Admin/Reseller root accounts |
| parent_account_id | uuid FK → accounts.id | null for root; set for `user` sub-accounts |
| first_login_at | timestamp null | first login must use SMS code, not password |
| created_at / updated_at / deleted_at | | |

### `auth_codes`
| id | otp_code | account_id FK | purpose enum(`first_login`,`password_reset`) | expires_at | used_at |

### `sessions` / `refresh_tokens`
Standard JWT session tracking (device, ip, expires_at).

## 2. Profile Content Tables (shared shape across account types)

These are reused by Individual, Family Adult, Family Underage, School Student, School
Employee, Business Employee, Institution Employee — linked via `owner_type` + `owner_id`
polymorphic pattern (or one FK column per parent table if the team prefers strict FKs).

### `person_profiles`
| id | owner_account_id FK | member_type enum(`self`,`adult`,`underage`,`student`,`employee`) | common_name | profile_code | pic_url | first_name | middle_name | last_name | gender | birthdate | age (generated) | nationality | nida_number | passport_number | fluent_language |

Business rule: `nida_number` required if `nationality = 'Tanzanian'`; `passport_number`
required if `nationality = 'Foreign'`.

### `mobile_numbers`
| id | person_profile_id FK | number | is_primary boolean | (supports the "2 fields" rule) |

### `basic_health_details`
| id | person_profile_id FK | blood_group | height | weight | age_auto (generated) |

### `residences`
| id | person_profile_id FK | region | district | ward | local_authority_name | street | extra_physical_details | neighborhood_friend_name | neighborhood_friend_contacts |

### `desperate_conditions`
| id | person_profile_id FK | acute_condition_code FK → lov_acute_conditions | notes | occurrence | unconscious_treatment_remedy | treatment_hospital | hospital_region | hospital_district | hospital_contacts | doctor_name | doctor_contacts |

### `emergency_contacts`
| id | person_profile_id FK | priority enum(`prime`,`option_2`,`option_3`) | full_name | mobile_1 | mobile_2 | alt_number_1 | alt_number_2 | relation_type FK → lov_relation_types | residence_details | fluent_language | region | district | ward | local_authority_name | extra_notes |

Rule: max 3 rows per `person_profile_id`; row with `priority = prime` is the first entered.

### `employment_details`
| id | person_profile_id FK | employment_type FK → lov_employment_types | is_locked boolean (true when `not_working`) |

### `employers`
| id | employment_detail_id FK | employer_name | employer_logo_url | position_lov FK → lov_positions | region | district | ward | local_authority_name | extra_notes | office_contacts |

### `supervisors`
| id | employment_detail_id FK | supervisor_name | supervisor_contacts_1 | supervisor_contacts_2 | close_friend_name | close_friend_contacts | extra_notes |

## 3. Account-Type-Specific Tables

### `families`
| id | account_id FK | family_name | family_pic_url | region | district | ward | local_authority_name | street | extra_physical_details | emergency_contact_1 | emergency_contact_2 | neighborhood_friend_name | neighborhood_friend_contacts |

### `family_doctors`
| id | family_id FK | hospital_name | region | district | hospital_contacts | doctor_name | doctor_contacts |

### `family_links`
| id | family_id FK | linking_code | linked_person_profile_id FK | linked_scheme (e.g. `school`) |

### `family_members`
| id | family_id FK | person_profile_id FK | member_role enum(`adult`,`underage`) |

### `underage_school_details` (extends person_profiles where member_type=underage)
| id | person_profile_id FK | school_name | school_logo_url | school_lov (I–VII) | region | district | ward | local_authority_name | extra_notes | school_contacts |

### `schools`
| id | account_id FK | school_name | registration_number | ownership enum(`private`,`government`,`religious`) | school_logo_url | region | district | ward | local_authority_name | extra_notes | school_contacts | manager_contacts |

### `school_members`
| id | school_id FK | person_profile_id FK | beneficiary_type enum(`student`,`employee`) | stream_lov (student only) |

### `businesses`
| id | account_id FK | business_name | dealership | tin_number | business_logo_url | region | district | ward | local_authority_name | extra_notes | business_contacts | manager_contacts |

### `business_members`
| id | business_id FK | person_profile_id FK |  (all business members are employees) |

### `institutions`
| id | account_id FK | institution_name | dealership | tin_number | institution_logo_url | region | district | ward | local_authority_name | extra_notes | institution_contacts | manager_contacts |

### `institution_members`
| id | institution_id FK | person_profile_id FK |

## 4. Profile Status / Payments

### `profile_status`
| id | account_id FK | paid_amount | paid_date | expire_date | renew_date | status enum(`active`,`expired`) |

Rule: on `expire_date` passing, a scheduled job sets `status = expired`; the public QR/URL
resolver must then redirect to `/payments/renew?profile_id=...` instead of the profile view.

### `payments`
| id | account_id FK | amount | currency | method enum(`mobile_wallet`,`bank`) | provider_reference | duration_months | status enum(`pending`,`success`,`failed`) | activated_by (system_admin_id or `auto`) | created_at |

## 5. Visibility & Printing

### `field_visibility`
Defines, per (account_type, entity, field), whether it is:
- default: **visible to public** (no flag in the spec),
- `PU`: togglable Public/Hide,
- `P`: optional-for-print.

| id | account_type | entity_name | field_name | flag enum(`none`,`PU`,`P`,`PU_P`) |

### `field_visibility_overrides`
Per-profile overrides when a user toggles a `PU` field to hidden.
| id | account_id FK | field_visibility_id FK | is_public boolean |

### `printable_cards`
| id | account_id FK | included_fields jsonb (list of field keys the user chose to print, limited to those with `P`/`PU_P`) | qr_code_url | generated_at |

Mandatory on every card regardless of settings: `profile_code`, `qr_code`.

## 6. Lookup (LOV) Tables — System-Admin editable

- `lov_acute_conditions` (seeded from the "List of Acute Conditions" appendix — heart attack, stroke, severe allergic reaction, suicidal thoughts, seizures, etc.)
- `lov_relation_types` (Mother, Father, Son, Daughter, Husband, Wife, Guardian, Grandfather, Grandmother, Next of Kin, Employer, Friend)
- `lov_employment_types` (Government, Foreign Government, Foreign Agency, Company, Cooperate, Self Employed, Not Working)
- `lov_positions` (Manager, …, System-Admin extendable)
- `lov_school_streams` (I–VII)
- `lov_ownership_types` (Private, Government, Religious)

## 7. System Admin / Audit

### `system_admin_logs`
| id | actor_account_id FK | action | target_account_id | payload jsonb | created_at |

### `url_access_logs`
| id | account_id FK | url | ip | user_agent | accessed_at | — powers "Be able to know the number of URL accessed periodical." |

### `sms_logs`
| id | account_id FK | type enum(`otp`,`reminder`,`alert`) | payload | status | sent_at |

## 8. Key Constraints Recap
1. `accounts.mobile_number` — unique, must start with `255`.
2. `emergency_contacts` — max 3 rows per `person_profile_id`, enforced via app-layer check (and optionally a DB trigger).
3. `person_profiles.nida_number` XOR `passport_number` required, conditioned on `nationality`.
4. `profile_status.expire_date` auto-set to **31 Dec of the registration/renewal year** for sub-accounts; root Admin accounts have `accounts.never_expires = true` and no `profile_status` expiry job applied.
5. `employment_details.is_locked = true` cascades to hide/disable `employers`/`supervisors` forms in the UI when `employment_type = not_working`.
6. Soft-delete (`deleted_at`) on `accounts` and all profile tables — never hard-delete identity/health data.
