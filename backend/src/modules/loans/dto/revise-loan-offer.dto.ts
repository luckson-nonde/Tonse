import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

/** Every field optional — a partial patch. Same loan-terms fields as
 *  MakeLoanOfferDto; inquiryId/condition are immutable post-creation. */
export class ReviseLoanOfferDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsNumber()
  interestRatePct?: number;

  @IsOptional()
  @IsString()
  interestType?: string;

  @IsOptional()
  @IsString()
  tenureMonths?: string;

  @IsOptional()
  @IsNumber()
  monthlyRepayment?: number;

  @IsOptional()
  @IsString()
  conditions?: string;
}
