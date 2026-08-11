import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsISO8601, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class MobileNumberDto {
  @IsString()
  number!: string;

  @IsOptional()
  is_primary?: boolean;
}

export class BasicHealthDto {
  @IsOptional()
  @IsString()
  blood_group?: string;
  @IsOptional()
  @IsString()
  height?: string;
  @IsOptional()
  @IsString()
  weight?: string;
}

export class ResidenceDto {
  @IsOptional()
  @IsString()
  region?: string;
  @IsOptional()
  @IsString()
  district?: string;
  @IsOptional()
  @IsString()
  ward?: string;
  @IsOptional()
  @IsString()
  local_authority_name?: string;
  @IsOptional()
  @IsString()
  street?: string;
  @IsOptional()
  @IsString()
  extra_physical_details?: string;
  @IsOptional()
  @IsString()
  neighborhood_friend_name?: string;
  @IsOptional()
  @IsString()
  neighborhood_friend_contacts?: string;
}

export class DesperateConditionDto {
  @IsOptional()
  @IsString()
  acute_condition_code?: string;
  @IsOptional()
  @IsString()
  notes?: string;
  @IsOptional()
  @IsString()
  occurrence?: string;
  @IsOptional()
  @IsString()
  unconscious_treatment_remedy?: string;
  @IsOptional()
  @IsString()
  treatment_hospital?: string;
  @IsOptional()
  @IsString()
  hospital_region?: string;
  @IsOptional()
  @IsString()
  hospital_district?: string;
  @IsOptional()
  @IsString()
  hospital_contacts?: string;
  @IsOptional()
  @IsString()
  doctor_name?: string;
  @IsOptional()
  @IsString()
  doctor_contacts?: string;
}

export class EmergencyContactDto {
  @IsOptional()
  @IsEnum(['prime', 'option_2', 'option_3'])
  priority?: 'prime' | 'option_2' | 'option_3';
  @IsString()
  full_name!: string;
  @IsOptional()
  @IsString()
  mobile_1?: string;
  @IsOptional()
  @IsString()
  mobile_2?: string;
  @IsOptional()
  @IsString()
  alt_number_1?: string;
  @IsOptional()
  @IsString()
  alt_number_2?: string;
  @IsOptional()
  @IsString()
  relation_type?: string;
  @IsOptional()
  @IsString()
  residence_details?: string;
  @IsOptional()
  @IsString()
  fluent_language?: string;
  @IsOptional()
  @IsString()
  region?: string;
  @IsOptional()
  @IsString()
  district?: string;
  @IsOptional()
  @IsString()
  ward?: string;
  @IsOptional()
  @IsString()
  local_authority_name?: string;
  @IsOptional()
  @IsString()
  extra_notes?: string;
}

export class EmployerDto {
  @IsOptional()
  @IsString()
  employer_name?: string;
  @IsOptional()
  @IsString()
  position_lov?: string;
  @IsOptional()
  @IsString()
  region?: string;
  @IsOptional()
  @IsString()
  district?: string;
  @IsOptional()
  @IsString()
  ward?: string;
  @IsOptional()
  @IsString()
  extra_notes?: string;
  @IsOptional()
  @IsString()
  office_contacts?: string;
}

export class SupervisorDto {
  @IsOptional()
  @IsString()
  supervisor_name?: string;
  @IsOptional()
  @IsString()
  supervisor_contacts_1?: string;
  @IsOptional()
  @IsString()
  supervisor_contacts_2?: string;
  @IsOptional()
  @IsString()
  close_friend_name?: string;
  @IsOptional()
  @IsString()
  close_friend_contacts?: string;
  @IsOptional()
  @IsString()
  extra_notes?: string;
}

export class EmploymentDto {
  @IsEnum(['Government', 'Foreign_Government', 'Foreign_Agency', 'Company', 'Cooperate', 'Self_Employed', 'Not_Working'])
  employment_type!: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployerDto)
  employer?: EmployerDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => SupervisorDto)
  supervisor?: SupervisorDto;
}

export class CreatePersonProfileDto {
  @IsOptional()
  @IsEnum(['self', 'adult', 'underage', 'student', 'employee'])
  member_type?: string;

  @IsOptional()
  @IsString()
  common_name?: string;

  @IsString()
  first_name!: string;
  @IsOptional()
  @IsString()
  middle_name?: string;
  @IsString()
  last_name!: string;
  @IsEnum(['Male', 'Female'])
  gender!: 'Male' | 'Female';
  @IsISO8601()
  birthdate!: string;
  @IsEnum(['Tanzanian', 'Foreign'])
  nationality!: 'Tanzanian' | 'Foreign';
  @IsOptional()
  @IsString()
  nida_number?: string;
  @IsOptional()
  @IsString()
  passport_number?: string;
  @IsOptional()
  @IsString()
  fluent_language?: string;
}

export class UpdatePersonProfileDto extends CreatePersonProfileDto {
  @IsOptional()
  pic_url?: string;
}

export class UpsertSubFormsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MobileNumberDto)
  mobile_numbers?: MobileNumberDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BasicHealthDto)
  health?: BasicHealthDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResidenceDto)
  residence?: ResidenceDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesperateConditionDto)
  desperate_conditions?: DesperateConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergency_contacts?: EmergencyContactDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => EmploymentDto)
  employment?: EmploymentDto;
}
