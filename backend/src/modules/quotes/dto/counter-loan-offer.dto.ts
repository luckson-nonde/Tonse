import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CounterLoanOfferDto {
  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @IsOptional()
  @IsNumber()
  maxInterestRatePct?: number;

  @IsOptional()
  @IsString()
  requestedTenure?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
