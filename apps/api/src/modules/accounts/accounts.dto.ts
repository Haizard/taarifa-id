import { IsEnum, IsString, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateSubAccountDto {
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
  nida_number?: string;

  @IsOptional()
  @IsString()
  passport_number?: string;

  @Matches(/^255\d{9}$/, { message: 'Mobile number must start with 255' })
  mobile_number!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LockDto {
  @IsString()
  account_id!: string;
}

export class ResetSubPasswordDto {
  @IsString()
  account_id!: string;

  @IsString()
  @MinLength(6)
  new_password!: string;
}

export class MoveAccountDto {
  @IsEnum(['individual', 'family', 'school', 'business', 'institution'])
  target_scheme!: 'individual' | 'family' | 'school' | 'business' | 'institution';

  @IsString()
  profile_id!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
