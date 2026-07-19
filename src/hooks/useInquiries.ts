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

/**
 * Fired by apiCall's background revalidation when a stale-while-revalidate
 * GET came back different from the cached copy it served. Hooks refetch on
 * it (cache-first — the revalidation already put the fresh data in cache).
 */
const DATA_REVALIDATED_EVENT = 'tonse:data-revalidated';

/** True when a revalidation event is about an inquiries endpoint. */
function isInquiriesRevalidation(e: Event): boolean {
  const endpoint = (e as CustomEvent).detail?.endpoint;
  return typeof endpoint === 'string' && endpoint.startsWith('/inquiries');
}

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
  // refresh() is called right after the caller's OWN mutation — the reload it
  // triggers must hit the network to prove the change, not the SWR cache.
  const forceNextRef = useRef(false);
  const refresh = () => {
    forceNextRef.current = true;
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!userId) {
      setInquiries([]);
      setLoading(false);
      return;
    }

    // force=false → stale-while-revalidate: paint the cached list instantly,
    // let the background revalidation broadcast if anything changed.
    // force=true → live network read; used when this load must reflect a
    // mutation that just happened (own delete/create/pay), where serving the
    // pre-mutation cache would flash the old state back for a round-trip.
    const loadInquiries = async (force = false) => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUserInquiries(userId, { swr: !force });
        setInquiries(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch inquiries'));
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };

    const initialForce = forceNextRef.current;
    forceNextRef.current = false;
    loadInquiries(initialForce);

    // Poll every 30 seconds so buyer sees inquiry status changes (e.g. OPEN → QUOTED)
    const interval = setInterval(() => loadInquiries(), 30000);

    // React immediately to local mutations so all hook instances stay
    // in sync without waiting for the next poll.
    const onChanged = () => loadInquiries(true);
    // Background revalidation found newer data — the cache is already fresh,
    // so a cache-first reload picks it up instantly.
    const onRevalidated = (e: Event) => {
      if (isInquiriesRevalidation(e)) loadInquiries();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(INQUIRIES_CHANGED_EVENT, onChanged);
      window.addEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener(INQUIRIES_CHANGED_EVENT, onChanged);
        window.removeEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
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
        // Cache-first: no own-mutation path feeds this hook, so serving the
        // cached list and refreshing in the background is always safe.
        const data = await fetchOpenInquiries({ swr: true });
        setInquiries(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch open inquiries'));
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();

    const onRevalidated = (e: Event) => {
      if (isInquiriesRevalidation(e)) loadInquiries();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
      }
    };
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
  /** Poll cadence. The default 8s is the no-push fallback; callers with a
   *  healthy SSE dispatch stream widen this (instant delivery comes over
   *  the stream, the poll is just reconciliation). */
  pollIntervalMs: number = 8000,
) {
  const [inquiries, setInquiries] = useState<InquiryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  // Same contract as useUserInquiries: refresh() follows the caller's own
  // action, so the reload it triggers bypasses the SWR cache.
  const forceNextRef = useRef(false);
  const refresh = () => {
    forceNextRef.current = true;
    setRefetchTrigger((prev) => prev + 1);
  };
  const seenIdsRef = useRef<Set<string> | null>(null);
  const onNewLeadsRef = useRef(onNewLeads);
  useEffect(() => { onNewLeadsRef.current = onNewLeads; }, [onNewLeads]);

  useEffect(() => {
    if (!userId) {
      setInquiries([]);
      setLoading(false);
      return;
    }
    const loadLeads = async (force = false) => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLeadsForMe(variant ? { variant } : undefined, {
          swr: !force,
        });
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
    const initialForce = forceNextRef.current;
    forceNextRef.current = false;
    loadLeads(initialForce);
    // Poll cadence: 8s when this poll is the only delivery channel (fast
    // enough to feel live), widened by callers when the SSE dispatch
    // stream is connected and instant delivery is push-based.
    const interval = setInterval(() => loadLeads(), pollIntervalMs);
    const onRevalidated = (e: Event) => {
      if (isInquiriesRevalidation(e)) loadLeads();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
      }
    };
  }, [userId, refetch, refetchTrigger, variant, pollIntervalMs]);

  return { inquiries, loading, error, refresh };
}
