import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SocialLinkDto {
  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  handle?: string;
}

/**
 * Hidden, invite-gated promoter signup (POST /promoter/signup).
 *
 * The invite key gates ACCESS (possession of the NDA packet); the selfie +
 * ID document + social links prove IDENTITY — the invite key travels
 * hand-to-hand, so signup must show it's really the artist registering.
 * The page that collects all of this is never linked from public nav.
 */
export class PromoterSignupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  inviteKey: string;

  @IsString()
  @IsOptional()
  phone?: string;

  /** Artist bio — optional colour, not identity-bearing. */
  @IsString()
  @IsOptional()
  bio?: string;

  /** The platforms the artist runs — at least one required. */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks: SocialLinkDto[];

  /** Live selfie (base64 data URL) — required identity proof. */
  @IsString()
  @IsNotEmpty()
  selfie: string;

  /** ID document photo/scan (base64 data URL) — required. */
  @IsString()
  @IsNotEmpty()
  idDocument: string;
}
