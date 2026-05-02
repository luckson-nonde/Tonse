/**
 * Custom hook to fetch inquiries from PostgreSQL backend
 * Replaces IndexedDB queries with API calls
 */

import { useState, useEffect } from 'react';
import {
  fetchUserInquiries,
  fetchOpenInquiries,
  InquiryResponse,
} from '../services/api/inquiryService';

/**
 * Hook to fetch user's own inquiries from backend
 */
export function useUserInquiries(userId?: string, refetch?: boolean) {
  const [inquiries, setInquiries] = useState<InquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const refresh = () => setRefetchTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!userId) {
      setInquiries([]);
      setLoading(false);
      return;
    }

    const loadInquiries = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUserInquiries(userId);
        setInquiries(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch inquiries'));
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();

    // Poll every 30 seconds so buyer sees inquiry status changes (e.g. OPEN → QUOTED)
    const interval = setInterval(loadInquiries, 30000);
    return () => clearInterval(interval);
  }, [userId, refetchTrigger]);

  return { inquiries, loading, error, refresh };
}

/**
 * Hook to fetch all open inquiries (for leads page)
 */
export function useOpenInquiries(refetch?: boolean) {
  const [inquiries, setInquiries] = useState<InquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadInquiries = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOpenInquiries();
        setInquiries(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch open inquiries'));
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();
  }, [refetch]);

  return { inquiries, loading, error };
}
