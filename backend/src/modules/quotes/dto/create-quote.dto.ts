import {
  IsString,
  IsNotEmpty,
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

export class CreateQuoteDto {
  @IsUUID()
  @IsNotEmpty()
  inquiryId: string;

  @IsString()
  @IsNotEmpty()
  inquiryTitle: string;

  @IsUUID()
  @IsNotEmpty()
  providerId: string;

  @IsString()
  @IsNotEmpty()
  providerName: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;

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
  status?: string = 'PENDING';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  expiryDuration?: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean = false;

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

  // Shape not yet populated by any current producer — kept permissive
  // rather than modeled, to avoid breaking a not-yet-found caller.
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

  // Genuinely open-ended: category-driven dynamic form data (per-category
  // schema, see src/services/categories/schemas/), plus loan terms when
  // condition === 'LOAN'. @IsObject() at least rejects a non-object payload.
  @IsOptional()
  @IsObject()
  dynamicFields?: Record<string, any>;

  @IsOptional()
  @IsEnum(['EXPRESS', 'STANDARD'])
  processType?: string = 'STANDARD';

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
  quoteType?: string = 'ORIGINAL';

  @IsOptional()
  @IsUUID()
  parentQuoteId?: string;
}
