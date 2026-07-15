import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemPriceDto, BuyerContactDto, DeliveryDto } from './quote-nested.dto';

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
    'SUPERSEDED',
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPriceDto)
  itemPrices?: ItemPriceDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BuyerContactDto)
  buyerContact?: BuyerContactDto;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  collectionCode?: string;

  @IsOptional()
  @IsArray()
  requirements?: Record<string, any>[];

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
  @IsObject()
  dynamicFields?: Record<string, any>;

  @IsOptional()
  @IsEnum(['EXPRESS', 'STANDARD'])
  processType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryDto)
  delivery?: DeliveryDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pickupLocation?: string;

  @IsOptional()
  @IsEnum(['ORIGINAL', 'REVISION'])
  quoteType?: string;

  @IsOptional()
  @IsUUID()
  parentQuoteId?: string;
}
