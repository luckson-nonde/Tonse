import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SocialLinkDto } from './promoter-signup.dto';

/**
 * PATCH /promoter/me — everything optional; only sent fields change.
 * Re-submitting the selfie or ID document drops verificationStatus back
 * to PENDING (identity must be re-reviewed).
 */
export class UpdatePromoterProfileDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  @IsOptional()
  socialLinks?: SocialLinkDto[];

  @IsString()
  @IsOptional()
  selfie?: string;

  @IsString()
  @IsOptional()
  idDocument?: string;
}
