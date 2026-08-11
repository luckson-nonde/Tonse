import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class VentureDepositDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Amount must be a valid money value' })
  amount: string;

  // Kept to mobile-money on purpose. DPO's hosted page offers card too, but a
  // deposit is a seller topping up their own balance, which the mobile-money
  // path already covers — widening it is a product decision, not a plumbing one.
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
