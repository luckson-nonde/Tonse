import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(10)
  phone: string;

  @IsEnum(['BUYER', 'SELLER', 'SERVICE_PROVIDER'])
  @IsOptional()
  role?: string; // Phase 2: legacy values (EVENTS, ENTERTAINMENT, SUPPLIER,
  // LABOUR) are now category strings, not roles. Backfill SQL already
  // collapsed existing rows. ADMIN is deliberately NOT accepted here —
  // admins are provisioned only via the seed CLI or POST /admin/managers
  // (public self-registration as admin was an open hole).

  @IsString()
  @IsNotEmpty()
  nrc: string; // National Registration Certificate - REQUIRED for identity verification

  @IsString()
  @IsOptional()
  profilePicture?: string; // Optional - Base64 encoded image or URL from front camera

  @IsString()
  @IsOptional()
  nrcDocument?: string; // Optional - Base64 encoded photo / scan of the NRC
  // document itself. Stored as users.nrcDocumentPath. Used by admin
  // verification to confirm the NRC number against the document.

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date of Birth must be in ISO 8601 format (YYYY-MM-DD)',
  })
  @IsOptional()
  dob?: string; // Date of Birth - Optional, ISO 8601 format (YYYY-MM-DD)

  /**
   * Stable category IDs the seller / service-provider subscribes to.
   * Carried directly through registration so the active profile + its
   * `seller_profile_categories` rows + the archetype cache all land in
   * the same transaction as user creation. Without this they had to
   * arrive in a follow-up PATCH /users/:id, which silently failed for
   * months — every seller ended up with empty subscriptions and zero
   * matched leads.
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  /**
   * Optional sub-role hint (e.g. PRODUCT_SELLER). Lands
   * on the active profile so categoryIds + subRole are coherent at
   * registration time.
   */
  @IsString()
  @IsOptional()
  subRole?: string;

  /**
   * Promoter referral code (?ref=CODE on the shared signup link). Pure
   * attribution metadata — threaded through registration in the same
   * server call (same lesson as categoryIds above: never a follow-up
   * PATCH). A bad/unknown code silently no-ops; it can never fail or
   * privilege a registration. Note PROMOTER is deliberately NOT accepted
   * by `role` here — promoter accounts are minted only via the
   * invite-gated POST /promoter/signup.
   */
  @IsString()
  @IsOptional()
  referralCode?: string;
}
