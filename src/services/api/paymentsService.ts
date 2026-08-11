import { apiClient } from './client';

/**
 * Hosted-page payment hand-off.
 *
 * The live provider (DPO) collects nothing in our app: the payer is sent to
 * DPO's own page to pay by card or mobile money, then returned to
 * `/payment/return`. So a checkout response carrying `redirectUrl` is not a
 * suggestion — leaving the payer on our page means the money is never taken.
 *
 * The sandbox provider models a push-to-handset PSP instead and returns NO
 * redirect, which is why every call site has to handle both: redirect when
 * there is one, fall back to the existing in-app pending/simulate UI when
 * there isn't.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

const HANDOFF_KEY = 'tonse:hosted-payment';

export interface HostedPaymentHandoff {
  /** OUR reference — the payer comes back with it as DPO's CompanyRef. */
  reference: string;
  /** In-app path to return the payer to once the outcome is known. */
  returnTo: string;
  /** What was being paid for, for the return screen's copy. */
  label?: string | undefined;
}

export interface HostedPaymentOutcome {
  handled: boolean;
  reason?: string;
  /** The psp_transactions status after verification. */
  status: string;
}

/** Anything a checkout endpoint returns that this module cares about. */
export interface CheckoutHandoffResult {
  reference: string;
  redirectUrl?: string;
}

/**
 * Send the payer to the provider's hosted page, remembering where they came
 * from. Returns false when the provider needs no redirect (sandbox), so the
 * caller can carry on with its own pending UI.
 *
 * `returnTo` defaults to wherever the payer is standing right now, which is the
 * right answer for the seller views: they mount inside the schema-driven
 * account renderer rather than at routes of their own, so no caller can name
 * its own path reliably.
 *
 * Navigation is a full page load, not a router push — the destination is
 * another origin.
 */
export function beginHostedPayment(
  result: CheckoutHandoffResult | null | undefined,
  opts: { returnTo?: string; label?: string } = {},
): boolean {
  if (!result?.redirectUrl) return false;
  const returnTo = opts.returnTo || `${window.location.pathname}${window.location.search}`;
  try {
    sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({
        reference: result.reference,
        returnTo,
        label: opts.label,
      } satisfies HostedPaymentHandoff),
    );
  } catch {
    // Private-mode storage failures must not strand the payer — the return page
    // can still recover the reference from DPO's own CompanyRef parameter.
  }
  window.location.assign(result.redirectUrl);
  return true;
}

export function readHostedPaymentHandoff(): HostedPaymentHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as HostedPaymentHandoff) : null;
  } catch {
    return null;
  }
}

export function clearHostedPaymentHandoff(): void {
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* nothing to clean up */
  }
}

/** Result of starting a quote checkout — the standard initiate shape. */
export interface QuoteCheckoutResult {
  reference: string;
  status: 'pending' | 'successful' | 'failed' | 'pay-offline' | string;
  amount: string;
  fee?: string;
  totalCharged?: string;
  /** Which adapter answered ('sandbox' | 'dpo') — picks the pending UI:
   *  simulate button vs the approve-on-phone polling card. */
  provider?: string;
  instruction?: string;
  redirectUrl?: string;
}

export const paymentsService = {
  /**
   * Buyer pays a quote — funds ESCROW on verified success (the server creates
   * the Order, flips the quote to PAID and mints the collection code; the
   * amount is read from the quote server-side, never from here).
   */
  async checkoutQuote(
    quoteId: string,
    dto: { channel?: 'mobile-money' | 'card'; phone?: string; operator?: string },
  ): Promise<QuoteCheckoutResult> {
    const res = await apiClient.post('/payments/checkout', { quoteId, ...dto });
    return payload<QuoteCheckoutResult>(res, {} as QuoteCheckoutResult);
  },

  /** Sandbox-only: stand in for the payer approving on their phone. */
  async simulateCheckout(
    reference: string,
    outcome: 'successful' | 'failed' = 'successful',
  ): Promise<{ handled: boolean }> {
    const res = await apiClient.post(
      `/payments/checkout/${encodeURIComponent(reference)}/simulate`,
      { outcome },
    );
    return payload(res, { handled: false });
  },

  /**
   * Ask the server to re-check this payment with the provider and settle it if
   * it really was paid. Safe to call repeatedly and safe to race the provider's
   * own notification — the server verifies independently and every funding step
   * is idempotent.
   */
  async verifyReturn(reference: string): Promise<HostedPaymentOutcome> {
    const res = await apiClient.post(
      `/payments/checkout/${encodeURIComponent(reference)}/verify`,
      {},
    );
    return payload<HostedPaymentOutcome>(res, { handled: false, status: 'PENDING' });
  },

  /** Poll a payment's stored status without triggering verification. */
  async getStatus(reference: string): Promise<{ reference: string; status: string; amount: string }> {
    const res = await apiClient.get(`/payments/checkout/${encodeURIComponent(reference)}`);
    return payload(res, { reference, status: 'PENDING', amount: '0.00' });
  },
};

export default paymentsService;
