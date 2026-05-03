import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsNotEmpty,
  IsOptional,
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

  @IsEnum(['BUYER', 'SELLER', 'SERVICE_PROVIDER', 'ADMIN'])
  @IsOptional()
  role?: string; // Phase 2: legacy values (EVENTS, ENTERTAINMENT, SUPPLIER,
  // LABOUR) are now category strings, not roles. Backfill SQL already
  // collapsed existing rows.

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
}
