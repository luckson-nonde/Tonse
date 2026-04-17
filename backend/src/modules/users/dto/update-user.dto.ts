import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

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
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED'])
  verificationStatus?: string;
}
