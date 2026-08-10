import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddScannerDto {
  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
