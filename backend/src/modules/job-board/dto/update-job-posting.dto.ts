import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JOB_RATE_UNITS } from '../entities/job-posting.entity';

/**
 * Edit-and-resubmit payload for a REJECTED posting. Every field optional;
 * whatever is present overwrites the stored value before the posting goes
 * back to PENDING_APPROVAL.
 */
export class UpdateJobPostingDto {
  @IsOptional()
  @IsString()
  @Length(3, 255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tradeCategoryIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workersNeeded?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payOffer?: number;

  @ValidateIf((o) => o.payOffer != null)
  @IsIn(JOB_RATE_UNITS as unknown as string[])
  payRateUnit?: string;

  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}
