import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Nested DTO class — required so the global ValidationPipe actually
 *  validates (and doesn't silently blank) each array element. */
export class TicketTierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsNumber()
  @Min(0)
  priceZmw: number;

  @IsInt()
  @Min(1)
  totalQuantity: number;
}

export class CreateTicketEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  venue: string;

  /** DateTimePicker datetime mode emits `yyyy-MM-ddTHH:mm`. */
  @IsISO8601()
  eventDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  posterUrl?: string;

  /** Exact venue pin — both or neither (service enforces the pairing). */
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketTierDto)
  tiers: TicketTierDto[];
}
