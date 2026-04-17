import {
  IsString,
  IsOptional,
  IsJSON,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  @IsOptional()
  processedAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;
}
