import { IsString, IsOptional, IsNotEmpty, IsUUID, IsNumber, IsEmail, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LenderContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * The known loan-terms fields LoanViews.tsx actually sends today
 * (interestRatePct, interestType, tenureMonths, monthlyRepayment,
 * conditions) plus lenderContact. Unlike CreateQuoteDto.dynamicFields
 * (genuinely category-schema-driven and open-ended), a loan offer's terms
 * are a fixed, known set — so these are typed explicitly rather than left
 * as a catch-all.
 */
export class MakeLoanOfferDto {
  @IsUUID()
  @IsNotEmpty()
  inquiryId: string;

  @IsOptional()
  @IsString()
  inquiryTitle?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LenderContactDto)
  lenderContact?: LenderContactDto;

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
