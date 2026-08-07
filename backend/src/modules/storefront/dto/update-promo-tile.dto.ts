import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Every field optional — hand-written rather than PartialType so the nullable
 * "clear this target" semantics can be spelled out. Sending `null` for a
 * target/subtitle field clears it; omitting the key leaves it untouched.
 */
export class UpdatePromoTileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ctaLabel?: string | null;

  @IsOptional()
  @IsUUID()
  targetProductId?: string | null;

  @IsOptional()
  @IsUUID()
  targetShopProfileId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetCategoryId?: string | null;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'backgroundColor must be a hex colour like #f5efe6' })
  backgroundColor?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** One tile's new position. A class, not an inline object type: the global
 *  ValidationPipe silently corrupts un-classed nested objects. */
export class ReorderPromoTileItemDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderPromoTilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderPromoTileItemDto)
  tiles: ReorderPromoTileItemDto[];
}
