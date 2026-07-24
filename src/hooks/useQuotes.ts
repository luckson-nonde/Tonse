/**
 * Custom hook to fetch quotes from PostgreSQL backend
 * Fetches quotes sent by providers in response to buyer inquiries
 */

import { useState, useEffect, useRef } from 'react';
import { fetchUserQuotes, QuoteResponse } from '../services/api/quoteService';

/** See useInquiries.ts — fired by apiCall's SWR background revalidation. */
const DATA_REVALIDATED_EVENT = 'tonse:data-revalidated';

function isQuotesRevalidation(e: Event): boolean {
  const endpoint = (e as CustomEvent).detail?.endpoint;
  return typeof endpoint === 'string' && endpoint.startsWith('/quotes');
}

/**
 * Cross-component refresh bus for quotes — mirror of the
 * `tonse:inquiries-changed` pattern in useInquiries.ts. The SSE dispatch
 * stream fires this when a quote lands / reserve releases, so every mounted
 * useUserQuotes instance (dashboard lists AND the sidebar badge counters in
 * DashboardLayout) resyncs instantly without prop drilling.
 */
const QUOTES_CHANGED_EVENT = 'tonse:quotes-changed';
export function notifyQuotesChanged() {
  window.dispatchEvent(new Event(QUOTES_CHANGED_EVENT));
}

/**
 * Hook to fetch user's quotes from backend
 * For buyers: fetches quotes received for their inquiries
 * For providers: fetches quotes they sent
 */
export function useUserQuotes(userId?: string, refetch?: boolean) {
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // refresh() follows the caller's own mutation — its reload must hit the
  // network, not the SWR cache (see useInquiries.ts for the full rationale).
  const forceNextRef = useRef(false);
  const refresh = () => {
    forceNextRef.current = true;
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!userId) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    // force=false → stale-while-revalidate (instant cached paint, background
    // refresh); force=true → live read that must prove a just-made change.
    const loadQuotes = async (force = false) => {
      try {
        setLoading(true);
        setError(null);
        // Explicit limit — the backend defaults to page size 10 when none is
        // passed, which silently capped every consumer of this hook (badge
        // counts, calendar dots, Received Quotes, and now Transaction
        // History's Requests/Expired tabs) to the buyer's 10 most-recently-
        // created quotes account-wide. A live, still-payable quote on an
        // older inquiry could fall outside that window and read as "no
        // response" — this is a correctness fix, not just a display cutoff.
        const data = await fetchUserQuotes({ limit: 200 }, { swr: !force });
        setQuotes(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch quotes'));
        setQuotes([]);
      } finally {
        setLoading(false);
      }
    };

    const initialForce = forceNextRef.current;
    forceNextRef.current = false;
    loadQuotes(initialForce);

    // Poll every 30 seconds so buyer sees new quotations without manual
    // refresh; the event bus below delivers the instant path when the SSE
    // stream reports a change.
    const interval = setInterval(() => loadQuotes(), 30000);
    const onChanged = () => loadQuotes(true);
    const onRevalidated = (e: Event) => {
      if (isQuotesRevalidation(e)) loadQuotes();
    };
    window.addEventListener(QUOTES_CHANGED_EVENT, onChanged);
    window.addEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
    return () => {
      clearInterval(interval);
      window.removeEventListener(QUOTES_CHANGED_EVENT, onChanged);
      window.removeEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
    };
  }, [userId, refetchTrigger]);

  return { quotes, loading, error, refresh };
}
