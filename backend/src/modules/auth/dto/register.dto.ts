import { IsEmail, IsString, MinLength, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

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

  @IsEnum([
    'BUYER',
    'SELLER',
    'SUPPLIER',
    'SERVICE_PROVIDER',
    'ENTERTAINMENT',
    'EVENTS',
    'LABOUR',
    'ADMIN',
  ])
  @IsOptional()
  role?: string; // Optional, defaults to BUYER

  @IsString()
  @IsNotEmpty()
  nrc: string; // National Registration Certificate - REQUIRED for identity verification

  @IsString()
  @IsOptional()
  profilePicture?: string; // Optional - Base64 encoded image or URL from front camera
}
