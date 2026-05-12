/**
 * Custom hook to fetch inquiries from PostgreSQL backend
 * Replaces IndexedDB queries with API calls
 */

import { useState, useEffect, useRef } from 'react';
import {
  fetchUserInquiries,
  fetchOpenInquiries,
  fetchLeadsForMe,
  InquiryResponse,
} from '../services/api/inquiryService';

/**
 * Cross-component invalidation event. Code that mutates a buyer's
 * inquiry list (delete, create, post-pay status flip) should call
 * `notifyInquiriesChanged()` so every mounted `useUserInquiries`
 * refetches immediately. Without this, the dashboard's stat cards and
 * the calendar widget (separate hook instances) drift out of sync until
 * the next 30s poll tick — the symptom the buyer was hitting where
 * deleting an inquiry left the calendar count stale.
 */
const INQUIRIES_CHANGED_EVENT = 'tonse:inquiries-changed';

export function notifyInquiriesChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(INQUIRIES_CHANGED_EVENT));
  }
}

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

    // React immediately to local mutations so all hook instances stay
    // in sync without waiting for the next poll.
    const onChanged = () => loadInquiries();
    if (typeof window !== 'undefined') {
      window.addEventListener(INQUIRIES_CHANGED_EVENT, onChanged);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener(INQUIRIES_CHANGED_EVENT, onChanged);
      }
    };
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

/**
 * Phase: matching — server-side, ID-based, hierarchy-aware leads
 * matching for the authenticated provider. Replaces the
 * "fetch every OPEN + filter client-side" pattern. The backend
 * resolves the caller's seller/service-provider profile via JWT,
 * walks the recursive ancestry of their subscribed categories, and
 * returns only the matching inquiries.
 */
export function useMatchedLeads(
  userId?: string,
  refetch?: boolean,
  variant?: string,
  onNewLeads?: (newLeads: InquiryResponse[]) => void,
) {
  const [inquiries, setInquiries] = useState<InquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const refresh = () => setRefetchTrigger((prev) => prev + 1);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const onNewLeadsRef = useRef(onNewLeads);
  useEffect(() => { onNewLeadsRef.current = onNewLeads; }, [onNewLeads]);

  useEffect(() => {
    if (!userId) {
      setInquiries([]);
      setLoading(false);
      return;
    }
    const loadLeads = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLeadsForMe(variant ? { variant } : undefined);
        setInquiries(data);

        // New-lead detection. The first poll after mount establishes a
        // baseline (no alert — these are pre-existing leads); subsequent
        // polls compare against it and fire onNewLeads for any id not
        // in the baseline. Lets the consumer pop a loud alert without
        // bothering the provider with stale leads on every page load.
        const ids = new Set(
          data.map((d: any) => String(d.id)).filter(Boolean),
        );
        if (seenIdsRef.current === null) {
          seenIdsRef.current = ids;
        } else {
          const fresh = data.filter(
            (d: any) => d.id && !seenIdsRef.current!.has(String(d.id)),
          );
          if (fresh.length > 0 && onNewLeadsRef.current) {
            onNewLeadsRef.current(fresh);
          }
          seenIdsRef.current = ids;
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch matched leads'));
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };
    loadLeads();
    // Poll every 8 seconds — fast enough that a provider hears the
    // alert "live" while the buyer is still on the new-inquiry success
    // screen, slow enough not to hammer the API for leads that almost
    // never change minute-to-minute.
    const interval = setInterval(loadLeads, 8000);
    return () => clearInterval(interval);
  }, [userId, refetch, refetchTrigger, variant]);

  return { inquiries, loading, error, refresh };
}
