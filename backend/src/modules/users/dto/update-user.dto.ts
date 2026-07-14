import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * UpdateUserDto — every field a typed, validated optional. Replaces the
 * previous escape-hatch `metadata?: Record<string, any>` and the frontend's
 * TOP_LEVEL_USER_KEYS whitelist. After Phase 1 the User entity has real
 * columns for everything below, so this DTO is the single source of truth
 * for what the backend accepts.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nrc?: string;

  // `location` was a composite "City, Province" display string. No
  // profile entity actually carries that column — `province` + `city`
  // are the real storage. Any caller that sent `location` 500'd
  // updateProfile with "Property location was not found in
  // SellerProfile." Dropped from the DTO so forbidNonWhitelisted
  // catches it cleanly with a 400 if anyone re-introduces the field.

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  socialLinks?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  pin?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'])
  verificationStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  /** Business/shop logo (directory-card brand mark) — provider profiles
   *  only; distinct from profilePicture, the owner's photo. */
  @IsOptional()
  @IsString()
  logo?: string;

  /** Shop image / cover shown on directory cards — provider profiles only.
   *  GET /shops falls back to the newest product image when unset. */
  @IsOptional()
  @IsString()
  coverImage?: string;

  // ===== Promoted from metadata jsonb (Phase 1) =====

  @IsOptional()
  @IsString()
  @MaxLength(50)
  subRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radius?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tpin?: string;

  @IsOptional()
  @IsString()
  incorporationCertUrl?: string;

  @IsOptional()
  @IsString()
  bozLicenceNumber?: string;

  @IsOptional()
  @IsString()
  bozLicenceUrl?: string;

  /** Per-loan-type Terms & Conditions: { collateral, salary, government,
   *  general }. Routed to the service-provider profile (not an auth field). */
  @IsOptional()
  @IsObject()
  loanTerms?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  labourCategory?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labourSubTypes?: string[];

  // Verification audit fields (admin-controlled)

  @IsOptional()
  @IsString()
  verificationRejectionReason?: string;

  @IsOptional()
  verifiedAt?: Date;

  @IsOptional()
  rejectedAt?: Date;

  @IsOptional()
  @IsBoolean()
  isNrcVerified?: boolean;

  @IsOptional()
  @IsString()
  nrcDocumentPath?: string;

  /**
   * Stable category IDs the seller / service-provider profile is
   * subscribed to. Stored as junction rows
   * (seller_profile_categories / service_provider_profile_categories);
   * server recomputes archetype on every write.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsEnum(['RETAIL', 'RENTAL', 'BOOKING', 'LABOUR', 'REPAIR', 'SERVICE', 'EVENTS', 'ENTERTAINMENT', 'WHOLESALE', 'LENDING'])
  archetype?: string;
}
