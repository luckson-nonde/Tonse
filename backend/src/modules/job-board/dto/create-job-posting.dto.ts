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

export class CreateJobPostingDto {
  @IsString()
  @Length(3, 255)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  /** Labour trade category ids (children of `labour`), e.g. ['electrician'].
   *  Flat string array — no @ValidateNested needed. */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tradeCategoryIds: string[];

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

  /** Required whenever a pay offer is entered, meaningless without one. */
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

  /** Per-trade form answers + urgency/preferredDateTime. Sent as a real
   *  object (not a JSON string — unlike inquiries' @IsJSON convention). */
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}
