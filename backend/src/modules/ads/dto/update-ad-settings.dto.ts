import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsObject, IsOptional, Min, ValidateNested } from 'class-validator';
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
  /** Per-placement ZMW/day, e.g. { HOMEPAGE_CENTER: 8, SECONDARY_SIDEBAR: 5, BUNDLE_ALL: 12 }. */
  @IsOptional()
  @IsObject()
  baseRates?: Record<string, number>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdDiscountTierDto)
  discountTiers?: AdDiscountTierDto[];
}
