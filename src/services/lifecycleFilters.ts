/**
 * Canonical lifecycle predicates for the buyer dashboard's three
 * surfaces. Use these everywhere a list view scopes its data — don't
 * roll new status checks per surface, or the rules drift out of sync.
 *
 * The lifecycle: an item moves through three stages and lives in
 * exactly one buyer-side section at a time.
 *
 *   Stage 1  My Inquiries        OPEN inquiry, no quotes yet
 *   Stage 2  Received Quotes     quote landed, buyer hasn't paid
 *   Stage 3  Order History       buyer paid, order placed
 *
 * Status writes are server-authoritative:
 *   QuotesService.create → inquiry.status = QUOTED
 *   OrdersService.create → quote.status = PAID, inquiry.status = CLOSED
 *
 * The frontend never PATCHes statuses — it just reads them and slices.
 *
 * Signatures are loose `{ status?: string }`-shaped so the helpers
 * accept both the strict-union entity types (Inquiry, Quote) and the
 * `*Response` shapes our hooks return (status typed as string).
 */

import { isQuoteExpired } from '../utils/quoteExpiry';

interface StatusBearing {
  status?: string | null;
}
interface ArchivableQuote extends StatusBearing {
  isArchived?: boolean;
  createdAt?: string | number | Date | null;
  expiryDuration?: string | null;
}

/**
 * Stage 1 predicate. True for inquiries that haven't received a quote
 * yet, so they're still soliciting providers. Hides QUOTED (a quote
 * has landed) and CLOSED (the inquiry has been paid out or cancelled).
 */
export const isActiveInquiry = (i: StatusBearing): boolean =>
  String(i.status || '').toUpperCase() === 'OPEN';

/**
 * Stage 2 predicate. True for quotes that are still live and unresolved
 * (pay, reject, accept). Hides PAID (already turned into an order),
 * COMPLETED (parcel handed over), ARCHIVED (dismissed), REJECTED, and
 * SUPERSEDED (older revisions when the provider resubmits).
 *
 * Shared by BOTH sides of the deal — the buyer's Received Quotes page/badge
 * AND the seller's My Quotes page/badge/calendar dot all key off this same
 * predicate so badge counts never drift from what the corresponding page
 * shows. Do NOT fold buyer-only concepts (like quote expiry) into this —
 * see isActiveBuyerQuote below.
 */
export const isActiveQuote = (q: ArchivableQuote): boolean => {
  const status = String(q.status || '').toUpperCase();
  return ['PENDING', 'ACCEPTED'].includes(status) && !q.isArchived;
};

/**
 * Buyer-only refinement of isActiveQuote: also hides quotes whose
 * provider-set "Quote Valid For" window has elapsed unpaid (see
 * src/utils/quoteExpiry.ts) — surfaced separately on the buyer's
 * Transaction History "Expired" tab instead. Expiry is a buyer-facing
 * concept only ("you need a new quotation") — the seller's My Quotes page
 * has no equivalent, which is why this isn't folded into isActiveQuote
 * itself (that would desync the seller's badge/calendar from their own
 * unfiltered My Quotes list).
 */
export const isActiveBuyerQuote = (q: ArchivableQuote): boolean =>
  isActiveQuote(q) && !isQuoteExpired(q);

/**
 * Stage 3 predicate. True for orders that exist as paid placements,
 * regardless of fulfilment progress. Used to count + list orders on
 * the buyer side.
 */
export const isOrderPlaced = (o: StatusBearing): boolean => {
  const status = String(o.status || '').toUpperCase();
  return ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(status);
};

/**
 * Report Manager split. "Current" = still in fulfilment; "Past" =
 * reached a terminal state (COMPLETED or CANCELLED). Unlike
 * isOrderPlaced, these two partition the full status space so every
 * order lands in exactly one of the two tabs.
 */
export const isCurrentOrder = (o: StatusBearing): boolean => {
  const status = String(o.status || '').toUpperCase();
  return ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(status);
};

export const isPastOrder = (o: StatusBearing): boolean => {
  const status = String(o.status || '').toUpperCase();
  return ['COMPLETED', 'CANCELLED'].includes(status);
};

/**
 * True while a quote is being financed through a lender — the buyer chose "Pay
 * via lending institution" and no disbursement has funded it yet. The quote is
 * still ACCEPTED (so it stays in Stage 2), but should render an "awaiting
 * financing" state for the buyer and a "financing in progress" badge for the
 * seller. Reads the flag the financing flow stamps on the quote's dynamicFields.
 */
export const isFinancingActive = (q: { dynamicFields?: any }): boolean =>
  ((q?.dynamicFields?.financing?.status ?? '') as string) === 'REQUESTED';
