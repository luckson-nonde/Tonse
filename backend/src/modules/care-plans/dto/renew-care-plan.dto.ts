import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RenewCarePlanDto {
  /** Display-only payment method (e.g. "MTN Mobile Money") — the renewal is
   *  simulated, mirroring BillingService.paySubscription. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;
}
