import { IsUUID } from 'class-validator';

/**
 * A care plan is always born from a quote the provider sent and the buyer
 * accepted/paid — everything else (client, needs, rate, payment model) is
 * derived server-side from the quote + its inquiry, then edited via PATCH.
 * Keeping the DTO to one field means the server, not the client, decides
 * ownership and seed data.
 */
export class CreateCarePlanDto {
  @IsUUID()
  quoteId: string;
}
