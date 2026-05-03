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
} from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  /**
   * Province + city are the inquiry's destination scope. City is what
   * the matching system broadcasts against when no coordinates are
   * provided (default behaviour: every provider in that city sees the
   * inquiry). When coordinates are present, matching narrows further.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  radius?: number;

  @IsOptional()
  @IsJSON()
  items?: Record<string, any>[];

  @IsOptional()
  @IsJSON()
  preferences?: Record<string, any>;

  @IsOptional()
  @IsJSON()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsEnum(['EXPRESS', 'STANDARD'])
  processType?: string = 'STANDARD';

  @IsOptional()
  @IsEnum(['OPEN', 'QUOTED', 'CLOSED'])
  status?: string = 'OPEN';

  @IsOptional()
  @IsEnum(['quotation', 'purchase_order', 'order_confirmation', 'delivery_order', 'completed'])
  currentStage?: string = 'quotation';

  @IsOptional()
  @IsBoolean()
  isLabour?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  labourGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  labourSubType?: string;
}
