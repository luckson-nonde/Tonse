import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AdMediaType, AdPlacementLocation } from '../entities/advertisement.entity';

export class CreateAdvertisementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  targetUrl: string;

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

  @IsIn(['HOMEPAGE_CENTER', 'SECONDARY_SIDEBAR', 'CATEGORY_SIDEBAR', 'BUNDLE_ALL'])
  placementLocation: AdPlacementLocation;

  /** Master category slug to target — CATEGORY_SIDEBAR only; omit for "all categories". */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetCategoryId?: string;

  @IsInt()
  @Min(1)
  durationDays: number;
}
