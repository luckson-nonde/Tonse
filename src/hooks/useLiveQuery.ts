/**
 * useLiveQuery Hook - Replacement for dexie-react-hooks
 * Provides reactive data fetching from API instead of IndexedDB
 * Works with both async and sync queries
 */

import { useState, useEffect, useRef } from 'react';

interface UseLiveQueryOptions {
  refetchInterval?: number; // Milliseconds between refetches (0 = no polling)
}

/**
 * Hook that fetches data and keeps it in sync
 * Replaces dexie-react-hooks' useLiveQuery
 *
 * Usage:
 * const data = useLiveQuery(() => db.inquiries.where('buyerId').equals(userId).toArray(), [userId]) || [];
 */
export function useLiveQuery<T>(
  query: () => Promise<T | undefined> | T | undefined,
  deps?: any[],
  defaultValue?: T
): T | undefined {
  const [data, setData] = useState<T | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Execute the query - it can return a Promise or a value
        const queryResult = query();
        const result = await Promise.resolve(queryResult);

        if (isMountedRef.current) {
          setData(result);
        }
      } catch (error) {
        console.error('Error in useLiveQuery:', error);
        if (isMountedRef.current) {
          setData(defaultValue);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, deps || []);

  return data !== undefined ? data : defaultValue;
}

/**
 * Hook that provides live query with polling support
 * Useful for data that needs to be refreshed periodically
 */
export function useLiveQueryWithPolling<T>(
  query: () => Promise<T | undefined> | T | undefined,
  deps?: any[],
  options?: UseLiveQueryOptions
): T | undefined {
  const defaultInterval = 5000; // 5 seconds default
  const interval = options?.refetchInterval ?? defaultInterval;

  const [data, setData] = useState<T | undefined>();
  const intervalRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        const queryResult = query();
        const result = await Promise.resolve(queryResult);
        if (isMountedRef.current) {
          setData(result);
        }
      } catch (error) {
        console.error('Error in useLiveQueryWithPolling:', error);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling if interval > 0
    if (interval > 0) {
      intervalRef.current = setInterval(fetchData, interval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, deps || []);

  return data;
}
