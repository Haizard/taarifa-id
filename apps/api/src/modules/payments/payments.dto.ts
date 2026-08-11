import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(['mobile_wallet', 'bank'])
  method!: 'mobile_wallet' | 'bank';

  @IsInt()
  @Min(1)
  @Max(36)
  duration_months!: number;

  @IsOptional()
  @IsString()
  wallet_phone?: string;
}
