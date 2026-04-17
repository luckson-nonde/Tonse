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

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  quoteId: string;

  @IsUUID()
  @IsNotEmpty()
  buyerId: string;

  @IsUUID()
  @IsNotEmpty()
  sellerId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'])
  status?: string = 'PENDING';

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
}
