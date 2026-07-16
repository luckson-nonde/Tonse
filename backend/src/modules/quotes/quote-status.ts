/**
 * Quote status — the single source of truth for what a status means for MONEY.
 *
 * Escrow lives on the QUOTE (`quote.status`), never on the order, so these
 * constants are the definition of "the buyer's funds are held". They were
 * previously duplicated and DISAGREED (`collection.service` omitted
 * `PENDING_COLLECTION` while the account-deletion check included it), which
 * created a trap state: a quote could block the buyer's account deletion while
 * never appearing in the provider's collection queue, so the escrow could
 * never be released. One list now, imported by every caller.
 */

/** The buyer has paid and the money is still held — not yet released to the
 *  seller, not yet refunded. Anything in here is an open escrow position. */
export const ESCROW_HOLDING_STATUSES = [
  'PAID',
  'PENDING_COLLECTION',
  'AWAITING_PICKUP',
] as const;

/**
 * Statuses a CLIENT may never set directly. Each represents money movement or
 * fulfilment and is written ONLY by the server-side flow that owns it:
 *   • PAYMENT_PENDING / PAID  → the payment + PSP webhook flow
 *   • AWAITING_PICKUP         → CollectionService.verify
 *   • COMPLETED / HANDED_OVER → CollectionService.complete (releases escrow)
 *   • CANCELLED / REFUNDED    → the cancellation + refund flow
 *
 * Without this, `PATCH /quotes/:id/status` let a buyer self-assign `PAID`
 * (minting escrow with no order and no money) and let a provider jump straight
 * to `COMPLETED` (discharging escrow with no release and no ledger record).
 */
export const SYSTEM_ONLY_STATUSES = [
  'PAYMENT_PENDING',
  'PAID',
  'PENDING_COLLECTION',
  'AWAITING_PICKUP',
  'COMPLETED',
  'HANDED_OVER',
  'CANCELLED',
  'REFUNDED',
] as const;

/** Statuses a client (buyer or provider) may set via the status endpoint. */
export const CLIENT_SETTABLE_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'ARCHIVED',
] as const;

export function isEscrowHolding(status: string): boolean {
  return (ESCROW_HOLDING_STATUSES as readonly string[]).includes(status);
}

export function isSystemOnlyStatus(status: string): boolean {
  return (SYSTEM_ONLY_STATUSES as readonly string[]).includes(status);
}
