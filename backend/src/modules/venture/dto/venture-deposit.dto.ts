import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class VentureDepositDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Amount must be a valid money value' })
  amount: string;

  // Card requires a PCI-encrypted payload (see lenco.provider.ts) — out of
  // scope for now, so this only ever accepts mobile-money.
  @IsOptional()
  @IsIn(['mobile-money'])
  channel?: 'mobile-money';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  operator?: string;
}
