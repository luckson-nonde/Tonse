import {
  IsString,
  IsOptional,
  IsJSON,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsJSON()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsJSON()
  contactInfo?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  followerCount?: number;
}
