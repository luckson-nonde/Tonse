import { IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class DeclineLoanDto {
  @IsUUID()
  @IsNotEmpty()
  inquiryId: string;

  @IsOptional()
  @IsString()
  inquiryTitle?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
