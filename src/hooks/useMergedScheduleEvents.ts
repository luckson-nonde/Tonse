import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, addYears, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { CalendarEvent } from '../types';
import { useAuth } from '../AuthContext';
import { useCalendarEvents } from './useCalendarEvents';
import {
  fetchBuyerOrders,
  fetchSellerOrders,
  type OrderRecord,
} from '../services/api/orderService';
import {
  deriveGigEventsFromOrders,
  type DerivedGigEvent,
} from '../services/derivedGigEvents';

/**
 * One unified "thing on your schedule" — either a system-derived gig
 * (read-only, from paid orders) or a user-created calendar entry.
 * Extracted from SchedulePage so the dashboard ScheduleTimelineCard and
 * the /schedule page group days from the exact same merged stream.
 */
export interface MergedEvent {
  key: string;
  date: string; // yyyy-MM-dd (occurrence date for recurring entries)
  startTime: string;
  endTime: string;
  title: string;
  note?: string;
  kind: 'gig' | 'manual';
  status: string;
  /** Gig-only metadata; undefined for manual events. */
  gig?: DerivedGigEvent;
  /** Manual-only metadata — the BASE event (edits/deletes act on it). */
  manual?: CalendarEvent;
  /** True when this row is a generated occurrence of a repeating event. */
  isRecurringOccurrence?: boolean;
}

const MAX_OCCURRENCES = 400; // runaway guard for pathological ranges

/**
 * Expand a repeating base event into its occurrence dates within
 * [rangeStart, rangeEnd] (inclusive). The base date itself counts as an
 * occurrence when in range. v1 semantics: the rule projects forward only —
 * editing or deleting affects the base event (every occurrence).
 */
export function expandOccurrenceDates(
  event: Pick<CalendarEvent, 'date' | 'repeatRule'>,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const base = parseISO(event.date);
  if (Number.isNaN(base.getTime())) return [];
  const rule = event.repeatRule ?? 'NONE';

  if (rule === 'NONE') {
    return base >= stripTime(rangeStart) && base <= rangeEnd ? [event.date] : [];
  }
  if (base > rangeEnd) return [];

  const out: string[] = [];
  let cursor = base;

  // Fast-forward cheap rules so an old base date doesn't mean thousands of
  // iterations before the window.
  const start = stripTime(rangeStart);
  if (cursor < start) {
    const gapDays = differenceInCalendarDays(start, cursor);
    if (rule === 'DAILY') {
      cursor = addDays(cursor, gapDays);
    } else if (rule === 'WEEKLY') {
      cursor = addDays(cursor, Math.floor(gapDays / 7) * 7);
    }
  }

  let guard = 0;
  while (cursor <= rangeEnd && guard < MAX_OCCURRENCES) {
    guard += 1;
    if (cursor >= start) {
      // MONTHLY on the 29th/30th/31st: date-fns addMonths clamps to the
      // month's last day; treat a clamped day-of-month as "month has no
      // such day" and skip it, matching common calendar behavior.
      const clamped =
        rule === 'MONTHLY' && cursor.getDate() !== base.getDate();
      if (!clamped) out.push(format(cursor, 'yyyy-MM-dd'));
    }
    if (rule === 'DAILY') cursor = addDays(cursor, 1);
    else if (rule === 'WEEKLY') cursor = addDays(cursor, 7);
    else if (rule === 'MONTHLY') cursor = addMonthsKeepingDay(cursor, base.getDate());
    else if (rule === 'YEARLY') cursor = addYears(cursor, 1);
    else break;
  }
  return out;
}

function stripTime(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** addMonths that re-targets the base day-of-month after a clamped month. */
function addMonthsKeepingDay(cursor: Date, day: number): Date {
  const next = addMonths(cursor, 1);
  if (next.getDate() !== day) {
    // Clamped (e.g. Jan 31 → Feb 28). Try to restore the intended day; if
    // the month is genuinely shorter the loop's clamp check skips it.
    const restored = new Date(next.getFullYear(), next.getMonth(), day);
    if (restored.getMonth() === next.getMonth()) return restored;
  }
  return next;
}

/**
 * Manual calendar entries (with recurrence expanded) merged with derived
 * gig events from paid orders, limited to [rangeStart, rangeEnd].
 * Both perspectives' orders are pulled so a user who is sometimes the
 * buyer and sometimes the seller sees every booking they're involved in
 * (same approach SchedulePage always used).
 */
export function useMergedScheduleEvents(rangeStart: Date, rangeEnd: Date) {
  const { user } = useAuth();

  const dateFrom = format(rangeStart, 'yyyy-MM-dd');
  const dateTo = format(rangeEnd, 'yyyy-MM-dd');
  const {
    events: manualEvents,
    loading: manualLoading,
    refresh,
  } = useCalendarEvents({ dateFrom, dateTo }, !!user?.id);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  useEffect(() => {
    const id = user?.id ? String(user.id) : '';
    if (!id) return;
    let cancelled = false;
    Promise.allSettled([fetchSellerOrders(id), fetchBuyerOrders(id)]).then((results) => {
      if (cancelled) return;
      const merged: OrderRecord[] = [];
      const seen = new Set<string>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const o of r.value) {
            if (!seen.has(o.id)) {
              seen.add(o.id);
              merged.push(o);
            }
          }
        }
      }
      setOrders(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const derivedGigs = useMemo<DerivedGigEvent[]>(() => {
    const id = user?.id ? String(user.id) : '';
    return orders.flatMap((o) => {
      const perspective = o.sellerId === id ? 'seller' : 'buyer';
      return deriveGigEventsFromOrders([o], perspective);
    });
  }, [orders, user?.id]);

  const events = useMemo<MergedEvent[]>(() => {
    const out: MergedEvent[] = [];

    for (const e of manualEvents) {
      const occurrences = expandOccurrenceDates(e, rangeStart, rangeEnd);
      for (const date of occurrences) {
        out.push({
          key: `m-${e.id}@${date}`,
          date,
          startTime: e.startTime ?? '',
          endTime: e.endTime ?? '',
          title: e.title,
          note: e.description ?? undefined,
          kind: 'manual',
          status: e.status,
          manual: e,
          isRecurringOccurrence: e.repeatRule !== 'NONE' && date !== e.date,
        });
      }
    }

    for (const g of derivedGigs) {
      const d = parseISO(g.date);
      if (d < stripTime(rangeStart) || d > rangeEnd) continue;
      out.push({
        key: g.id,
        date: g.date,
        startTime: g.startTime,
        endTime: g.endTime,
        title: g.title,
        note: g.note,
        kind: 'gig',
        status: g.status,
        gig: g,
      });
    }

    return out.sort(
      (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    );
  }, [manualEvents, derivedGigs, rangeStart.getTime(), rangeEnd.getTime()]);

  return { events, loading: manualLoading, refresh };
}
