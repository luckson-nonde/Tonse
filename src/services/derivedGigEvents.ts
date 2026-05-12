import type { OrderRecord } from './api/orderService';

/**
 * Synthetic calendar event derived from a paid order. The buyer-indicated
 * event date lives inside `order.quote.inquiry.attributes` (the form
 * schema for events / entertainment / labour categories writes
 * `eventDate`, `eventDateTime`, `bookingDate`, etc.).
 *
 * These events are read-only on the calendar — the source of truth is the
 * underlying order, not a manually-edited record. The schedule view
 * distinguishes them from manual notes via `kind: 'gig'` so it can render
 * a brand-coloured badge and disable edit/delete.
 */
export interface DerivedGigEvent {
  /** Stable id derived from the order id so React keys are predictable. */
  id: string;
  kind: 'gig';
  /** ISO date string `yyyy-MM-dd` — what the calendar matches against. */
  date: string;
  /** HH:mm 24h. Defaults to '00:00' if the inquiry didn't capture a time. */
  startTime: string;
  endTime: string;
  title: string;
  /** Short subtitle the schedule view shows under the title (counterparty). */
  counterparty?: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  /** Maps to a calendar accent: 'gig' uses brand gold; future kinds can
   *  add their own. */
  accent: 'gold';
  amountZmw: number;
  orderNumber: string;
  orderId: string;
  inquiryId?: string;
  /** Free-form notes pulled from the inquiry's title + first attribute hint. */
  note?: string;
}

/** Per-perspective: am I rendering this calendar from the buyer's or
 *  the seller's point of view? Affects the counterparty label. */
export type GigPerspective = 'buyer' | 'seller';

const DATE_KEYS = [
  'eventDate',
  'eventDateTime',
  'bookingDate',
  'serviceDate',
  'deliveryDate',
  'startDate',
  'requiredDate',
  'preferredDate',
  'date',
];

const END_DATE_KEYS = ['eventEndDate', 'endDate', 'serviceEndDate'];

const TIME_KEYS = ['eventTime', 'startTime', 'time'];
const END_TIME_KEYS = ['eventEndTime', 'endTime'];

function pickFirst<T = string>(obj: Record<string, any> | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

/** Splits a value that may be either an ISO date string ("2026-05-15"),
 *  an ISO datetime ("2026-05-15T18:00"), or a Date instance into a
 *  `{ date, time }` pair the calendar can use directly. */
function splitDateTime(raw: unknown): { date: string; time?: string } | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const iso = raw.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO datetime "2026-05-15T18:00:00.000Z" or "2026-05-15T18:00"
  const dtMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (dtMatch) return { date: dtMatch[1], time: dtMatch[2] };

  // Plain date "2026-05-15"
  const dMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dMatch) return { date: dMatch[1] };

  // Fallback: try Date parsing. Returns yyyy-MM-dd in local time so the
  // displayed day matches what the buyer entered (Date.toISOString()
  // would shift across timezones).
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const min = String(parsed.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

const PAID_STATUSES = new Set(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED']);

/**
 * Convert an array of OrderRecord into calendar-ready gig events.
 * Cancelled orders are excluded. Orders missing both a buyer-indicated
 * date and a backend deliveryDate fall back to the order's createdAt so
 * they're at least surfaced (a lone "Paid order" with no scheduled date
 * is still useful intel for the provider; better to show on the wrong
 * day than to silently drop it).
 */
export function deriveGigEventsFromOrders(
  orders: OrderRecord[],
  perspective: GigPerspective,
): DerivedGigEvent[] {
  const out: DerivedGigEvent[] = [];

  for (const order of orders) {
    if (!PAID_STATUSES.has(order.status)) continue;

    const inquiry = order.quote?.inquiry;
    const attrs = inquiry?.attributes;

    // Date resolution priority:
    //   1. Buyer-indicated date in inquiry attributes (eventDate, etc.)
    //   2. The order's own deliveryDate (set when an admin/operator
    //      schedules fulfilment manually)
    //   3. The order's createdAt — last-resort so a paid gig still
    //      surfaces on the calendar even when no one captured a date.
    const indicated   = splitDateTime(pickFirst(attrs, DATE_KEYS));
    const orderDelivery = (order as any).deliveryDate
      ? splitDateTime((order as any).deliveryDate)
      : null;
    const fallback    = order.createdAt ? splitDateTime(order.createdAt) : null;
    const resolved    = indicated ?? orderDelivery ?? fallback;
    if (!resolved) continue;

    const endIndicated = splitDateTime(pickFirst(attrs, END_DATE_KEYS));
    const startTime = (pickFirst<string>(attrs, TIME_KEYS) ?? resolved.time ?? '09:00').slice(0, 5);
    const endTime = (pickFirst<string>(attrs, END_TIME_KEYS) ?? endIndicated?.time ?? addHours(startTime, 1)).slice(0, 5);

    const counterpartyUser = perspective === 'seller' ? order.buyer : order.seller;
    const counterparty =
      counterpartyUser?.businessName ||
      counterpartyUser?.fullName ||
      counterpartyUser?.email;

    const title = inquiry?.title?.trim() || `Order #${order.orderNumber}`;

    out.push({
      id: `gig-${order.id}`,
      kind: 'gig',
      date: resolved.date,
      startTime,
      endTime,
      title,
      counterparty,
      status: order.status,
      accent: 'gold',
      amountZmw: Number(order.totalAmount) || 0,
      orderNumber: order.orderNumber,
      orderId: order.id,
      inquiryId: inquiry?.id,
      note: order.notes,
    });
  }

  return out;
}

function addHours(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = (h * 60 + m + delta * 60 + 24 * 60) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}
