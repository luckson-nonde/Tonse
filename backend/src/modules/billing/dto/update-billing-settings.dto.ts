import {
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Nested tiers need a real validated class — the global ValidationPipe runs
 * whitelist:true, which strips every key of a nested object that isn't
 * decorated (a plain `{count,price}[]` TS type arrives as empty objects).
 */
export class QuoteTierDto {
  @IsInt()
  @Min(1)
  count: number;

  @IsNumber()
  @Min(0)
  price: number;
}

/** Admin partial update — only the fields present are changed. */
export class UpdateBillingSettingsDto {
  @IsOptional()
  @IsBoolean()
  subscriptionsEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteTierDto)
  quoteTiers?: QuoteTierDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetedInquiryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number;

  @IsOptional()
  @IsBoolean()
  jobPostingFeeEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  jobPostingFee?: number;
}
