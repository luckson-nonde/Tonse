/**
 * Custom hook to fetch quotes from PostgreSQL backend
 * Fetches quotes sent by providers in response to buyer inquiries
 */

import { useState, useEffect } from 'react';
import { fetchUserQuotes, QuoteResponse } from '../services/api/quoteService';

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

  const refresh = () => setRefetchTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!userId) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    const loadQuotes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUserQuotes();
        setQuotes(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch quotes'));
        setQuotes([]);
      } finally {
        setLoading(false);
      }
    };

    loadQuotes();

    // Poll every 30 seconds so buyer sees new quotations without manual
    // refresh; the event bus below delivers the instant path when the SSE
    // stream reports a change.
    const interval = setInterval(loadQuotes, 30000);
    const onChanged = () => loadQuotes();
    window.addEventListener(QUOTES_CHANGED_EVENT, onChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener(QUOTES_CHANGED_EVENT, onChanged);
    };
  }, [userId, refetchTrigger]);

  return { quotes, loading, error, refresh };
}
