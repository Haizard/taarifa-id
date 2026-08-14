export const ACCOUNT_TYPES = ['individual', 'family', 'school', 'business', 'institution'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface RegisterDto {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: 'Male' | 'Female';
  birthdate: string;
  nationality: 'Tanzanian' | 'Foreign';
  nida_number?: string;
  passport_number?: string;
  mobile_number: string;
  email?: string;
  account_type: AccountType;
  password: string;
  pic_url?: string;
}

export interface FirstLoginDto {
  mobile_number: string;
  otp_code: string;
  profile_id: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RefreshDto {
  refresh_token: string;
}

export interface ForgotPasswordDto {
  mobile_number: string;
}

export interface ResetPasswordDto {
  otp_code: string;
  mobile_number: string;
  new_password: string;
}

export interface ChangePasswordDto {
  old_password: string;
  new_password: string;
}

export interface CreateSubAccountDto {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: 'Male' | 'Female';
  birthdate: string;
  nationality: 'Tanzanian' | 'Foreign';
  nida_number?: string;
  passport_number?: string;
  mobile_number: string;
  username: string;
  password: string;
}

export interface ResetSubPasswordDto {
  account_id: string;
  new_password: string;
}

export interface MoveAccountDto {
  target_scheme: AccountType;
  profile_id: string;
  username: string;
  password: string;
}

export interface CreatePersonProfileDto {
  member_type?: string;
  common_name?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: 'Male' | 'Female';
  birthdate: string;
  nationality: 'Tanzanian' | 'Foreign';
  nida_number?: string;
  passport_number?: string;
  fluent_language?: string;
}

export interface UpdatePersonProfileDto extends CreatePersonProfileDto {
  pic_url?: string;
}

export interface MobileNumberDto {
  number: string;
  is_primary?: boolean;
}

export interface BasicHealthDto {
  blood_group?: string;
  height?: string;
  weight?: string;
}

export interface ResidenceDto {
  region?: string;
  district?: string;
  ward?: string;
  local_authority_name?: string;
  street?: string;
  extra_physical_details?: string;
  neighborhood_friend_name?: string;
  neighborhood_friend_contacts?: string;
}

export interface DesperateConditionDto {
  acute_condition_code?: string;
  notes?: string;
  occurrence?: string;
  unconscious_treatment_remedy?: string;
  treatment_hospital?: string;
  hospital_region?: string;
  hospital_district?: string;
  hospital_contacts?: string;
  doctor_name?: string;
  doctor_contacts?: string;
}

export interface EmergencyContactDto {
  priority?: 'prime' | 'option_2' | 'option_3';
  full_name: string;
  mobile_1?: string;
  mobile_2?: string;
  alt_number_1?: string;
  alt_number_2?: string;
  relation_type?: string;
  residence_details?: string;
  fluent_language?: string;
  region?: string;
  district?: string;
  ward?: string;
  local_authority_name?: string;
  extra_notes?: string;
}

export interface EmployerDto {
  employer_name?: string;
  position_lov?: string;
  region?: string;
  district?: string;
  ward?: string;
  extra_notes?: string;
  office_contacts?: string;
}

export interface SupervisorDto {
  supervisor_name?: string;
  supervisor_contacts_1?: string;
  supervisor_contacts_2?: string;
  close_friend_name?: string;
  close_friend_contacts?: string;
  extra_notes?: string;
}

export interface EmploymentDto {
  employment_type: string;
  employer?: EmployerDto;
  supervisor?: SupervisorDto;
}

export interface UpsertSubFormsDto {
  mobile_numbers?: MobileNumberDto[];
  health?: BasicHealthDto;
  residence?: ResidenceDto;
  desperate_conditions?: DesperateConditionDto[];
  emergency_contacts?: EmergencyContactDto[];
  employment?: EmploymentDto;
}

export interface CreatePaymentDto {
  amount: number;
  method: 'mobile_wallet' | 'bank';
  duration_months: number;
  wallet_phone?: string;
}

export interface ActivateAccountDto {
  profile_id: string;
  amount: number;
  duration_months: number;
  activated_by?: string;
  actor_account_id?: string;
}

export interface CreateLookupDto {
  table: 'acute' | 'employment' | 'position' | 'stream' | 'ownership';
  code: string;
  label: string;
}
