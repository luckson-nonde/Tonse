import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsJSON,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateShopDto {
  @IsUUID()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  coverImage?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

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
  isActive?: boolean = true;
}
