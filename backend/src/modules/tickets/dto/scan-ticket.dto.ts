import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ScanTicketDto {
  /** The scanned QR payload or hand-typed code — `TIX-XXXXXX` (prefix optional). */
  @IsString()
  @MaxLength(40)
  code: string;

  /** When set, a ticket from a DIFFERENT event is rejected as WRONG_EVENT —
   *  the door team scans in the context of the event they're working. */
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
