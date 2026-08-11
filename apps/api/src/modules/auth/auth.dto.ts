import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const ACCOUNT_TYPES = ['individual', 'family', 'school', 'business', 'institution'] as const;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  first_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middle_name?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  last_name!: string;

  @IsEnum(['Male', 'Female'])
  gender!: 'Male' | 'Female';

  @IsString()
  birthdate!: string;

  @IsEnum(['Tanzanian', 'Foreign'])
  nationality!: 'Tanzanian' | 'Foreign';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nida_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  passport_number?: string;

  @Matches(/^255\d{9}$/, { message: 'Mobile number must start with 255 and be 12 digits' })
  mobile_number!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsIn(ACCOUNT_TYPES)
  account_type!: (typeof ACCOUNT_TYPES)[number];

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}

export class FirstLoginDto {
  @IsString()
  mobile_number!: string;

  @IsString()
  otp_code!: string;

  @IsString()
  profile_id!: string;
}

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refresh_token!: string;
}

export class ForgotPasswordDto {
  @IsString()
  mobile_number!: string;
}

export class ResetPasswordDto {
  @IsString()
  otp_code!: string;

  @IsString()
  mobile_number!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  new_password!: string;
}

export class ChangePasswordDto {
  @IsString()
  old_password!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  new_password!: string;
}
