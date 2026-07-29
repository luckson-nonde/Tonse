import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Buyer opens a financing request for a product quote they own. */
export class CreateFinancingRequestDto {
  @IsUUID()
  productQuoteId: string;

  /** Repayment period, e.g. "12 months". Free-form select value. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tenureMonths?: string;

  /** Employment/salary + consent fields from the loan-government form. Kept as
   *  a bag (schema-driven), but validated as an object so it can't be an array
   *  or a huge string. Sensitive fields inside are handled downstream. */
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  /** Optionally address the request to a single lender instead of broadcasting. */
  @IsOptional()
  @IsUUID()
  targetedLenderId?: string;
}

/** Lender initiates disbursement (pays the principal into the holding account). */
export class InitiateDisbursementDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsIn(['mtn', 'airtel', 'zamtel'])
  operator?: string;
}
