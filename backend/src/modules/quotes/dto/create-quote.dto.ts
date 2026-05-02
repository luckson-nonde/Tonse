import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
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
  processType?: string = 'STANDARD';

  @IsOptional()
  delivery?: any;

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
