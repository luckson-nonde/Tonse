import { addWeeks, addMonths, isBefore } from 'date-fns';

// Mirrors the fixed VALIDITY_OPTIONS set every provider quote form offers
// (src/services/quoteSchemaGenerator.ts) — the "Quote Valid For" pick,
// stored verbatim on Quote.expiryDuration. Loans use a differently-named
// field for the same six options and are excluded from expiry checks by
// callers (they have their own dedicated Loan Offers flow).
const VALIDITY_DURATIONS: Record<string, (base: Date) => Date> = {
  '1 Week': (base) => addWeeks(base, 1),
  '2 Weeks': (base) => addWeeks(base, 2),
  '1 Month': (base) => addMonths(base, 1),
  '2 Months': (base) => addMonths(base, 2),
  '3 Months': (base) => addMonths(base, 3),
  '6 Months': (base) => addMonths(base, 6),
};

interface ExpirableQuote {
  createdAt?: string | number | Date | null;
  expiryDuration?: string | null;
}

/**
 * True once a provider's chosen "Quote Valid For" window has elapsed since
 * the quote was submitted. Unrecognized or missing duration/date never
 * counts as expired — a false negative just leaves a quote looking active
 * a little longer; a false positive would hide a still-payable quote.
 */
export function isQuoteExpired(quote: ExpirableQuote): boolean {
  if (!quote.createdAt || !quote.expiryDuration) return false;
  const addDuration = VALIDITY_DURATIONS[quote.expiryDuration];
  if (!addDuration) return false;
  const createdAt = new Date(quote.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  return isBefore(addDuration(createdAt), new Date());
}
