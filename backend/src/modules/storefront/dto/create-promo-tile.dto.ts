import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';

/** #rgb / #rrggbb only — the value lands in an inline style on a public page,
 *  so it must never carry arbitrary CSS. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class CreatePromoTileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  /** The `/uploads/…` path returned by POST /files/upload with
   *  category=promo-tile. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ctaLabel?: string;

  /** Click target — at most one is honoured, in the order
   *  product → shop → category. All three may be omitted: the tile then just
   *  points at the directory. */
  @IsOptional()
  @IsUUID()
  targetProductId?: string;

  @IsOptional()
  @IsUUID()
  targetShopProfileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetCategoryId?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'backgroundColor must be a hex colour like #f5efe6' })
  backgroundColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
