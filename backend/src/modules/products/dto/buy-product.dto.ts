import { IsInt, Min, Max } from 'class-validator';

export class BuyProductDto {
  /** Units to purchase — price/total always derive server-side from the listing. */
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
