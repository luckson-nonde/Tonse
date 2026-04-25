import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsEnum,
  IsArray,
  MinLength,
  MaxLength,
  IsUUID,
  IsJSON,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nrc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsEnum([
    'BUYER',
    'SELLER',
    'SUPPLIER',
    'SERVICE_PROVIDER',
    'ENTERTAINMENT',
    'EVENTS',
  ])
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  socialLinks?: string;
}
