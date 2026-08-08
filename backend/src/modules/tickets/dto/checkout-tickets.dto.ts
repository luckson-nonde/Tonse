import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Nested DTO class — required so the global ValidationPipe actually
 *  validates (and doesn't silently blank) each array element. */
export class TicketSelectionDto {
  @IsUUID()
  tierId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

/** Guest checkout — no account, so the buyer identifies themselves inline.
 *  At least one of phone/email is enforced in the service. */
export class CheckoutTicketsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketSelectionDto)
  selections: TicketSelectionDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  buyerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  buyerPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  buyerEmail?: string;
}
