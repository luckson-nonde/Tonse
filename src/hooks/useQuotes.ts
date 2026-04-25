/**
 * Custom hook to fetch quotes from PostgreSQL backend
 * Fetches quotes sent by providers in response to buyer inquiries
 */

import { useState, useEffect } from 'react';
import { fetchUserQuotes, QuoteResponse } from '../services/api/quoteService';

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
  }, [userId, refetchTrigger]);

  return { quotes, loading, error, refresh };
}
