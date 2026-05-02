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
