import {
  IsString,
  IsOptional,
  IsJSON,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsJSON()
  items?: Record<string, any>[];

  @IsOptional()
  deliveryDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;
}
