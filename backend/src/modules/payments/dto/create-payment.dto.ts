import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,  
  IsJSON,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['DEPOSIT', 'PAYMENT', 'WITHDRAWAL', 'REFUND', 'TRANSFER'])
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number = 0;

  @IsOptional()
  @IsEnum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'])
  status?: string = 'PENDING';

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
}
