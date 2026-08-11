/**
 * The PSP boundary.
 *
 * Nyuwe never custodies funds — a licensed provider does. Everything the
 * platform needs from that provider goes through this interface, so the money
 * flows can be built and tested end-to-end today against a Sandbox adapter and
 * switch to live DPO by changing one env var, with no redesign.
 *
 * Statuses mirror a real ZM collection lifecycle rather than an idealised one —
 * `pay-offline` and `3ds-auth-required` are real states a mobile-money or card
 * collection sits in, and pretending otherwise would leak into the ledger.
 */

export type CollectionStatus =
  | 'pending'
  | 'successful'
  | 'failed'
  | 'pay-offline'
  | '3ds-auth-required';

export type Channel = 'mobile-money' | 'card';
export type FeeBearer = 'customer' | 'merchant';

export interface FeeQuote {
  /** The deal amount that must reach the holding account. */
  amount: string;
  /** The provider's fee. With bearer 'customer' the payer is charged amount+fee
   *  and the provider keeps the fee — it never reaches Nyuwe. */
  fee: string;
  /** What the payer is actually charged. */
  totalCharged: string;
  bearer: FeeBearer;
  currency: string;
}

export interface InitiateCollectionInput {
  /** OUR reference — generated and persisted before this call. */
  reference: string;
  amount: string;
  currency: string;
  channel: Channel;
  bearer: FeeBearer;
  /** Payer MSISDN for mobile money. */
  phone?: string;
  operator?: string;
  email?: string;
  name?: string;
  description?: string;
}

export interface CollectionResult {
  reference: string;
  providerReference?: string;
  status: CollectionStatus;
  amount: string;
  fee?: string;
  currency: string;
  /** Present when the provider needs the payer to act (USSD prompt, 3DS). */
  instruction?: string;
  /**
   * Hosted-page providers (DPO) collect nothing until the payer completes a
   * payment on THEIR domain. When this is set the payer MUST be sent here or
   * the collection can never succeed — it is not an optional convenience.
   */
  redirectUrl?: string;
  raw?: Record<string, any>;
}

export interface RefundInput {
  reference: string;
  /** The original collection's provider reference. */
  originalProviderReference?: string;
  amount: string;
  currency: string;
  phone?: string;
  operator?: string;
  reason?: string;
}

export interface RefundResult {
  reference: string;
  providerReference?: string;
  status: 'pending' | 'successful' | 'failed';
  amount: string;
  fee?: string;
  currency: string;
  raw?: Record<string, any>;
}

export interface PayoutInput {
  reference: string;
  amount: string;
  currency: string;
  phone?: string;
  operator?: string;
  accountId?: string;
  narration?: string;
}

export interface PayoutResult {
  reference: string;
  providerReference?: string;
  status: 'pending' | 'successful' | 'failed';
  amount: string;
  fee?: string;
  currency: string;
  raw?: Record<string, any>;
}

export interface WebhookEvent {
  /** Provider's unique event id — the idempotency key for delivery. */
  eventId: string;
  type: 'collection' | 'refund' | 'payout' | 'unknown';
  /** OUR reference, echoed back. */
  reference?: string;
  providerReference?: string;
  status?: string;
  raw: Record<string, any>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentProvider {
  readonly name: string;

  /** What the payer will be charged, and what will actually land. */
  quoteFees(input: { amount: string; channel: Channel; bearer: FeeBearer }): Promise<FeeQuote>;

  initiateCollection(input: InitiateCollectionInput): Promise<CollectionResult>;

  /**
   * Authoritative status straight from the provider. ALWAYS called before
   * posting a funding journal — a webhook payload is attacker-influencable
   * input, so its amount and status are never trusted on their own.
   *
   * `providerReference` is the handle the provider itself issued (DPO's
   * TransToken), read from our own stored row rather than the callback — some
   * providers can only be queried by their handle, not by our reference.
   */
  verifyCollection(reference: string, providerReference?: string): Promise<CollectionResult>;

  refund(input: RefundInput): Promise<RefundResult>;

  payout(input: PayoutInput): Promise<PayoutResult>;

  /**
   * Parse and, where the provider allows it, authenticate a callback.
   *
   * Implementations that get a signature MUST verify it over the RAW body with
   * a timing-safe compare and throw on a mismatch. Implementations whose
   * provider signs nothing (DPO) must authenticate what they can — a shared
   * secret on the URL — and rely on `verifyCollection` for the real proof.
   * Either way a callback is a hint that something changed, never evidence
   * that it did: nothing here is trusted enough to move money on its own.
   *
   * `query` carries the request's query string, which is where a URL-embedded
   * shared secret arrives.
   */
  parseWebhook(
    rawBody: Buffer,
    headers: Record<string, any>,
    query?: Record<string, any>,
  ): WebhookEvent;
}
