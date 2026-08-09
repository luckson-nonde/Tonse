/**
 * Events-category helpers — the events counterpart to utils/loan.ts, feeding
 * the buyer sidebar's contextual "Sell Event Tickets" tab (requiresActivity:
 * 'events' in buyerAccountSchema + activitySignals in DashboardLayout).
 */

/** True if any of the passed category ids / names / titles denotes the events
 *  family (venues, weddings, conferences, event catering, …).
 *
 *  Bare 'decor' is deliberately NOT matched — it would false-positive on the
 *  `home-decor` master category; `event-decor` still matches via 'event'.
 *  'catering' is safe: only the events family carries it. */
export function isEventContext(
  ...vals: Array<string | string[] | undefined | null>
): boolean {
  const hay = vals
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /event|venue|wedding|conference|catering/.test(hay);
}
