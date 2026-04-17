import {
  IsString,
  IsOptional,
  IsUUID,
  IsJSON,
  IsNumber,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateInquiryDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

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
  processType?: string;

  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsEnum(['quotation', 'purchase_order', 'order_confirmation', 'delivery_order', 'completed'])
  currentStage?: string;

  @IsOptional()
  @IsNumber()
  viewCount?: number;

  @IsOptional()
  @IsBoolean()
  isLabour?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  labourGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  labourSubType?: string;
}
