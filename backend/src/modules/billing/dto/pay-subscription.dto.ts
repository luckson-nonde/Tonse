import { IsOptional, IsString, IsNumber } from 'class-validator';

/**
 * Simulated subscription payment. `amount` is accepted for shape-compat with
 * PaymentSheet's payload but IGNORED server-side — the charge is always the
 * current billing_settings.monthlyFee. Never trust a client-supplied amount,
 * even for simulated payments.
 */
export class PaySubscriptionDto {
  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}
