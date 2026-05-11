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

interface StatusBearing {
  status?: string | null;
}
interface ArchivableQuote extends StatusBearing {
  isArchived?: boolean;
}

/**
 * Stage 1 predicate. True for inquiries that haven't received a quote
 * yet, so they're still soliciting providers. Hides QUOTED (a quote
 * has landed) and CLOSED (the inquiry has been paid out or cancelled).
 */
export const isActiveInquiry = (i: StatusBearing): boolean =>
  String(i.status || '').toUpperCase() === 'OPEN';

/**
 * Stage 2 predicate. True for quotes the buyer can still act on (pay,
 * reject, accept). Hides PAID (already turned into an order),
 * COMPLETED (parcel handed over), ARCHIVED (buyer dismissed),
 * REJECTED, and SUPERSEDED (older revisions when the provider
 * resubmits).
 */
export const isActiveQuote = (q: ArchivableQuote): boolean => {
  const status = String(q.status || '').toUpperCase();
  return ['PENDING', 'ACCEPTED'].includes(status) && !q.isArchived;
};

/**
 * Stage 3 predicate. True for orders that exist as paid placements,
 * regardless of fulfilment progress. Used to count + list orders on
 * the buyer side.
 */
export const isOrderPlaced = (o: StatusBearing): boolean => {
  const status = String(o.status || '').toUpperCase();
  return ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(status);
};
