import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Detail-only edits. Tiers are deliberately NOT editable here — changing
 * price/quantity after tickets have sold silently rewrites what buyers paid
 * for; that needs its own carefully-scoped flow if ever wanted.
 */
export class UpdateTicketEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  venue?: string;

  @IsOptional()
  @IsISO8601()
  eventDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  posterUrl?: string;
}
