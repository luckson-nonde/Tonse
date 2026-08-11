import { registerAs } from '@nestjs/config';

/**
 * PSP configuration — SERVER SIDE ONLY.
 *
 * The provider key must never reach a browser: the browser talks to our API,
 * our API talks to the PSP. Never re-expose any of this through a
 * client-visible config or a Vite `define`.
 *
 * DPO (Direct Pay Online) is a HOSTED-PAGE provider: we create a transaction
 * token server-side, send the payer to DPO's page to pay by card or mobile
 * money, and DPO sends them back. There is no push-to-handset API and no
 * signed webhook — see dpo.provider.ts for how a callback is authenticated.
 */
export default registerAs('psp', () => ({
  /** 'sandbox' (no network, full lifecycle) or 'dpo' (live). */
  provider: process.env.PAYMENT_PROVIDER || 'sandbox',
  dpo: {
    /** DPO's XML API. Same host for test and live — the COMPANY TOKEN decides. */
    baseUrl: process.env.DPO_API_BASE_URL || 'https://secure.3gdirectpay.com/API/v6/',
    /** Hosted payment page the payer is redirected to with ?ID=<TransToken>.
     *  payv3 is the current page; payv2 is the older one and still resolves. */
    paymentPageUrl:
      process.env.DPO_PAYMENT_PAGE_URL || 'https://secure.3gdirectpay.com/payv3.php',
    /** The merchant credential. Authenticates EVERY call — treat as a password. */
    companyToken: process.env.DPO_COMPANY_TOKEN || '',
    /** DPO "Default Services Type" — the numeric service id from the portal.
     *  Not a secret, but createToken is rejected without a valid one. */
    defaultServiceType: process.env.DPO_DEFAULT_SERVICE_TYPE || '',
    /** Where DPO returns the payer after the hosted page (a frontend URL). */
    redirectUrl: process.env.DPO_REDIRECT_URL || '',
    /** Where DPO sends a payer who backs out (a frontend URL). */
    backUrl: process.env.DPO_BACK_URL || '',
    /** Payment Time Limit — hours the created token stays payable. */
    ptlHours: Number(process.env.DPO_PTL_HOURS || 24),
    /**
     * Shared secret carried on the Payment Notification URL configured in the
     * DPO portal (`.../webhooks/psp?secret=…`). DPO does not sign callbacks, so
     * this only keeps strangers from spamming the endpoint — the real
     * authentication is the server-side verifyToken call. Optional.
     */
    notificationSecret: process.env.DPO_NOTIFICATION_SECRET || '',
    /** Estimated merchant discount rate, for display + ledger memo only. DPO
     *  deducts its real fee at settlement, never from the payer. */
    estimatedFeePercent: Number(process.env.DPO_ESTIMATED_FEE_PERCENT || 3.5),
  },
  /** Platform commission deducted from the seller's release. Default 0 so the
   *  ledger is correct from day one and the rate can be switched on later. */
  commissionPercent: Number(process.env.PLATFORM_COMMISSION_PERCENT || 0),
  /**
   * Who bears the PSP collection fee. NOTE: the DPO adapter always behaves as
   * 'merchant' — DPO charges the payer exactly the amount we ask for and takes
   * its cut out of settlement, so there is no per-transaction fee to pass on.
   * This setting therefore only affects the sandbox adapter today.
   */
  feeBearer: (process.env.PSP_FEE_BEARER || 'customer') as 'customer' | 'merchant',
  /** Seller payouts are held this long after release so a post-completion
   *  dispute is still recoverable from SELLER_PAYABLE. */
  payoutHoldHours: Number(process.env.PAYOUT_HOLD_HOURS || 72),
}));
