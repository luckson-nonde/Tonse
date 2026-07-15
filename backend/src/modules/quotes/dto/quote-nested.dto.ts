import { IsString, IsOptional, IsNumber, IsBoolean, IsEmail, IsIn } from 'class-validator';

/** One line item's provider-set price. Matches the shape ProviderDashboard
 *  builds: { itemId, price }, with optional display fields some callers add. */
export class ItemPriceDto {
  @IsString()
  itemId: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;
}

/** Buyer contact info snapshotted onto the quote at creation time. */
export class BuyerContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

/** Delivery terms a provider attaches to a quote. */
export class DeliveryDto {
  @IsBoolean()
  offered: boolean;

  @IsNumber()
  fee: number;

  @IsIn(['SELLER_DELIVERY', 'PICKUP'])
  method: string;

  @IsOptional()
  @IsString()
  pickupInstructions?: string;
}
