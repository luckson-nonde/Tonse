import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';
import { AD_PLACEMENTS, AdMediaType, AdPlacementLocation } from '../entities/advertisement.entity';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAdvertisementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsIn(['IMAGE', 'VIDEO'])
  mediaType: AdMediaType;

  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  /** Client-measured runtime — re-validated server-side, VIDEO only. */
  @IsOptional()
  @IsNumber()
  @Max(15)
  videoDurationSeconds?: number;

  /** Every place this ad should run — at least one. Costs the same either
   *  way; price is a function of days, not of placement count. */
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(AD_PLACEMENTS, { each: true })
  placements: AdPlacementLocation[];

  /** Master category slug to target — only used when CATEGORY_SIDEBAR is one
   *  of the placements; omit for "all categories". */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetCategoryId?: string;

  /** Inclusive campaign window, `yyyy-MM-dd` (what DateTimePicker's date mode
   *  emits). durationDays is DERIVED from these — never client-supplied, same
   *  rule the price already follows. */
  @Matches(ISO_DATE, { message: 'startDate must be yyyy-MM-dd' })
  startDate: string;

  @Matches(ISO_DATE, { message: 'endDate must be yyyy-MM-dd' })
  endDate: string;
}
