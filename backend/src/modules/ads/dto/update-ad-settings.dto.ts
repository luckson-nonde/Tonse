import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { AdDiscountTier } from '../entities/ad-settings.entity';

/** Nested DTO class — required so the global ValidationPipe actually
 *  validates (and doesn't silently blank) each array element. */
export class AdDiscountTierDto implements AdDiscountTier {
  @IsInt()
  @Min(1)
  minDays: number;

  @IsNumber()
  @Min(0)
  discountPercentage: number;
}

export class UpdateAdSettingsDto {
  // ── Pop-up ("Spotlight") ads ─────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  popupEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  popupRatePerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  popupMaxPerSession?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  popupMinMinutesBetween?: number;

  /** ZMW/day for ANY placement — price scales with days, not placement. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseRatePerDay?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdDiscountTierDto)
  discountTiers?: AdDiscountTierDto[];
}
