import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  profile_id!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsInt()
  @Min(1)
  @Max(36)
  duration_months!: number;

  @IsOptional()
  @IsString()
  activated_by?: string;

  @IsOptional()
  @IsString()
  actor_account_id?: string;
}

export class CreateLookupDto {
  @IsString()
  table!: 'acute' | 'employment' | 'position' | 'stream' | 'ownership';

  @IsString()
  code!: string;

  @IsString()
  label!: string;
}
