import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsJSON,
  IsNumber,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
  IsDecimal,
} from 'class-validator';

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
  @IsJSON()
  itemPrices?: Record<string, any>[];

  @IsOptional()
  @IsJSON()
  buyerContact?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  collectionCode?: string;

  @IsOptional()
  @IsJSON()
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
  @IsJSON()
  dynamicFields?: Record<string, any>;

  @IsOptional()
  @IsEnum(['EXPRESS', 'STANDARD'])
  processType?: string = 'STANDARD';

  @IsOptional()
  @IsJSON()
  delivery?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pickupLocation?: string;
}
