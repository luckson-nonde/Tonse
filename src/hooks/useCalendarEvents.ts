import { useEffect, useRef, useState } from 'react';
import { CalendarEvent } from '../types';
import {
  fetchMyCalendarEvents,
  type CalendarEventRange,
} from '../services/api/calendarEventService';

/** See useInquiries.ts — fired by apiCall's SWR background revalidation. */
const DATA_REVALIDATED_EVENT = 'tonse:data-revalidated';

function isCalendarEventsRevalidation(e: Event): boolean {
  const endpoint = (e as CustomEvent).detail?.endpoint;
  return typeof endpoint === 'string' && endpoint.startsWith('/calendar-events');
}

/**
 * Cross-component refresh bus — mirror of notifyQuotesChanged in
 * useQuotes.ts. Fire after any create/update/delete so every mounted
 * consumer (sidebar calendar dots, dashboard timeline, /schedule page)
 * resyncs instantly without prop drilling.
 */
const CALENDAR_EVENTS_CHANGED_EVENT = 'tonse:calendar-events-changed';
export function notifyCalendarEventsChanged() {
  window.dispatchEvent(new Event(CALENDAR_EVENTS_CHANGED_EVENT));
}

/**
 * The signed-in user's personal calendar entries (scoping happens
 * server-side off the JWT — no userId param). No polling interval:
 * unlike quotes, these rows are only ever written by the user's own
 * actions, so the changed-event bus + SWR revalidation cover freshness.
 */
export function useCalendarEvents(range: CalendarEventRange = {}, enabled = true) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // refresh() follows the caller's own mutation — must hit the network,
  // not the SWR cache (see useInquiries.ts for the full rationale).
  const forceNextRef = useRef(false);
  const refresh = () => {
    forceNextRef.current = true;
    setRefetchTrigger((prev) => prev + 1);
  };

  const { dateFrom, dateTo, category, status } = range;

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async (force = false) => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMyCalendarEvents(
          { dateFrom, dateTo, category, status },
          { swr: !force },
        );
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch calendar events'));
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const initialForce = forceNextRef.current;
    forceNextRef.current = false;
    load(initialForce);

    const onChanged = () => load(true);
    const onRevalidated = (e: Event) => {
      if (isCalendarEventsRevalidation(e)) load();
    };
    window.addEventListener(CALENDAR_EVENTS_CHANGED_EVENT, onChanged);
    window.addEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
    return () => {
      cancelled = true;
      window.removeEventListener(CALENDAR_EVENTS_CHANGED_EVENT, onChanged);
      window.removeEventListener(DATA_REVALIDATED_EVENT, onRevalidated);
    };
  }, [enabled, dateFrom, dateTo, category, status, refetchTrigger]);

  return { events, loading, error, refresh };
}
