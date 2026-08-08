import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateEventTicketSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;
}
