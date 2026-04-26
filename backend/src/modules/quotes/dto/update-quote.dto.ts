import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  inquiryTitle?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  message?: string;

  @IsOptional()
  @IsEnum([
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'ARCHIVED',
    'PAID',
    'PENDING_COLLECTION',
    'AWAITING_PICKUP',
    'COMPLETED',
    'HANDED_OVER',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  expiryDuration?: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  itemPrices?: any;

  @IsOptional()
  buyerContact?: any;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  collectionCode?: string;

  @IsOptional()
  requirements?: any;

  @IsOptional()
  @IsUUID()
  venueSpaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  venueSpaceName?: string;

  @IsOptional()
  @IsNumber()
  damageDeposit?: number;

  @IsOptional()
  @IsNumber()
  cleaningFee?: number;

  @IsOptional()
  dynamicFields?: any;

  @IsOptional()
  @IsEnum(['EXPRESS', 'STANDARD'])
  processType?: string;

  @IsOptional()
  delivery?: any;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pickupLocation?: string;
}
