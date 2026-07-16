import { registerAs } from '@nestjs/config';

/**
 * PSP configuration — SERVER SIDE ONLY.
 *
 * The Lenco key previously lived in the frontend and was inlined into the
 * browser bundle by a Vite `define`, so every visitor received it. It now
 * exists only here: the browser talks to our API, our API talks to the PSP.
 * Never re-expose this through any client-visible config.
 */
export default registerAs('psp', () => ({
  /** 'sandbox' (no network, full lifecycle) or 'lenco' (live). */
  provider: process.env.PAYMENT_PROVIDER || 'sandbox',
  lenco: {
    baseUrl: process.env.LENCO_API_BASE_URL || 'https://api.lenco.co/access/v2',
    apiKey: process.env.LENCO_API_KEY || '',
    /** Used to verify webhook signatures over the raw body. */
    webhookSecret: process.env.LENCO_WEBHOOK_SECRET || '',
  },
  /** Platform commission deducted from the seller's release. Default 0 so the
   *  ledger is correct from day one and the rate can be switched on later. */
  commissionPercent: Number(process.env.PLATFORM_COMMISSION_PERCENT || 0),
  /** Who bears the PSP collection fee. 'customer' = buyer pays price + fee. */
  feeBearer: (process.env.PSP_FEE_BEARER || 'customer') as 'customer' | 'merchant',
  /** Seller payouts are held this long after release so a post-completion
   *  dispute is still recoverable from SELLER_PAYABLE. */
  payoutHoldHours: Number(process.env.PAYOUT_HOLD_HOURS || 72),
}));
