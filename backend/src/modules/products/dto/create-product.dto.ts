import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsJSON,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  IsArray,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subCategory?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number = 0;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  condition?: string;

  @IsOptional()
  @IsJSON()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
