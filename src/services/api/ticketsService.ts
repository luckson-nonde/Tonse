import { apiClient, API_BASE_URL } from './client';

/**
 * Client for the backend `/tickets/*` surface — event ticketing for sellers
 * in the events category. Two halves:
 *
 *  - Seller side (auth): create/manage events, sales stats, attendee list.
 *  - Public side (NO auth): what the share link `/e/:code` drives — view the
 *    event, park a PENDING order, then "pay" via the simulated mobile-money
 *    step. The payment is simulated (this app's convention) but the ledger
 *    credit to the seller's venture balance is real.
 *
 * The backend wraps responses as `{ statusCode, message, data }`.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export type TicketEventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export interface TicketTierSummary {
  id: string;
  name: string;
  priceZmw: number;
  totalQuantity: number;
  remainingQuantity: number;
}

/** A seller's event with sales aggregates, as returned by /tickets/my-events. */
export interface MyTicketEvent {
  id: string;
  sellerId: string;
  /** Public share code — the `:code` in `/e/:code`. */
  code: string;
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  posterUrl: string | null;
  /** Exact venue pin — see ticketMapsUrl(). */
  latitude: number | null;
  longitude: number | null;
  status: TicketEventStatus;
  createdAt: string;
  updatedAt: string;
  tiers: TicketTierSummary[];
  ticketsSold: number;
  /** How many sold tickets have been scanned in at the door. */
  checkedIn: number;
  grossZmw: number;
  netZmw: number;
}

export interface CreateTicketEventInput {
  title: string;
  description: string;
  venue: string;
  /** DateTimePicker datetime mode value (`yyyy-MM-ddTHH:mm`). */
  eventDate: string;
  posterUrl?: string;
  /** Exact venue pin — both or neither (backend enforces the pairing). */
  latitude?: number;
  longitude?: number;
  tiers: Array<{ name: string; priceZmw: number; totalQuantity: number }>;
}

export interface TicketSaleRow {
  id: string;
  reference: string;
  buyerName: string;
  buyerPhone: string | null;
  buyerEmail: string | null;
  lineItems: Array<{ tierId: string; tierName: string; quantity: number; unitPriceZmw: number }>;
  ticketCount: number;
  /** How many of this order's tickets have been scanned in. */
  checkedInCount: number;
  totalAmountZmw: number;
  netZmw: number;
  purchasedAt: string;
}

/** A door-team member the organizer assigned by email. */
export interface TicketScannerRow {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
  createdAt: string;
}

/** An event the caller may scan for — own events plus assigned ones. */
export interface ScanEventSummary {
  id: string;
  code: string;
  title: string;
  venue: string;
  eventDate: string;
  posterUrl: string | null;
  role: 'ORGANIZER' | 'SCANNER';
  ticketsSold: number;
  checkedIn: number;
}

export type ScanResultStatus = 'ADMITTED' | 'ALREADY_USED' | 'VOID' | 'NOT_FOUND' | 'WRONG_EVENT';

export interface ScanResult {
  result: ScanResultStatus;
  code: string;
  tierName?: string;
  buyerName?: string;
  buyerPhone?: string | null;
  eventTitle?: string;
  checkedInAt?: string | null;
}

/** What a guest sees on the share link. */
export interface PublicTicketEvent {
  code: string;
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  posterUrl: string | null;
  /** Exact venue pin — see ticketMapsUrl(). */
  latitude: number | null;
  longitude: number | null;
  organizerName: string | null;
  tiers: Array<{
    id: string;
    name: string;
    priceZmw: number;
    remainingQuantity: number;
    soldOut: boolean;
  }>;
}

export interface TicketCheckoutInput {
  selections: Array<{ tierId: string; quantity: number }>;
  buyerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
}

export interface TicketCheckoutResult {
  reference: string;
  totalAmountZmw: number;
  eventTitle: string;
}

export interface PaidTicketOrder {
  orderId: string;
  reference: string;
  status: 'PAID';
  buyerName: string;
  buyerPhone: string | null;
  buyerEmail: string | null;
  totalAmountZmw: number;
  /** True when the backend queued the ticket email to buyerEmail. */
  emailQueued?: boolean;
  tickets: Array<{ code: string; tierName: string }>;
}

/** The plain SPA URL of the public ticket page. */
export function ticketShareUrl(code: string): string {
  return `${window.location.origin}/e/${encodeURIComponent(code)}`;
}

/**
 * The URL sellers actually SHARE — the backend's server-rendered page whose
 * Open Graph tags give WhatsApp/Facebook a decorated preview (poster, title,
 * date, venue) before anyone clicks; humans are redirected straight to
 * `/e/:code`. The SPA URL alone can't do this: link crawlers never run the
 * app's JavaScript.
 */
export function ticketRichShareUrl(code: string): string {
  return `${API_BASE_URL}/tickets/public/${encodeURIComponent(code)}/share`;
}

/** Google Maps deep link for a venue pin — the universal cross-platform URL
 *  (opens the Maps app on phones, the site on desktop). Null without a pin. */
export function ticketMapsUrl(
  event: { latitude: number | null; longitude: number | null } | null | undefined,
): string | null {
  if (event?.latitude == null || event?.longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`;
}

/** Parse "lat, lng" text or a pasted Google Maps URL (`@lat,lng` /
 *  `q=lat,lng` / `query=lat,lng`) into a pin. Null when nothing parses. */
export function parseCoordinates(raw: string): { latitude: number; longitude: number } | null {
  const text = (raw || '').trim();
  if (!text) return null;
  const match =
    text.match(/@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/) ||
    text.match(/[?&](?:q|query|ll|destination)=(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/) ||
    text.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export const ticketsService = {
  // ───── Seller (auth) ───────────────────────────────────────────────────

  async createEvent(dto: CreateTicketEventInput): Promise<MyTicketEvent> {
    const res = await apiClient.post('/tickets/create', dto);
    return payload<MyTicketEvent>(res, {} as MyTicketEvent);
  },

  async listMyEvents(): Promise<MyTicketEvent[]> {
    const res = await apiClient.get('/tickets/my-events');
    return payload<MyTicketEvent[]>(res, []);
  },

  async cancelEvent(eventId: string): Promise<MyTicketEvent> {
    const res = await apiClient.post(`/tickets/${encodeURIComponent(eventId)}/cancel`);
    return payload<MyTicketEvent>(res, {} as MyTicketEvent);
  },

  async salesForEvent(eventId: string): Promise<TicketSaleRow[]> {
    const res = await apiClient.get(`/tickets/${encodeURIComponent(eventId)}/sales`);
    return payload<TicketSaleRow[]>(res, []);
  },

  // ───── Door team + check-in (auth) ─────────────────────────────────────

  async listScanners(eventId: string): Promise<TicketScannerRow[]> {
    const res = await apiClient.get(`/tickets/${encodeURIComponent(eventId)}/scanners`);
    return payload<TicketScannerRow[]>(res, []);
  },

  async addScanner(eventId: string, email: string, name?: string): Promise<TicketScannerRow[]> {
    const res = await apiClient.post(`/tickets/${encodeURIComponent(eventId)}/scanners`, {
      email,
      name: name || undefined,
    });
    return payload<TicketScannerRow[]>(res, []);
  },

  async removeScanner(eventId: string, scannerId: string): Promise<TicketScannerRow[]> {
    const res = await apiClient.delete(
      `/tickets/${encodeURIComponent(eventId)}/scanners/${encodeURIComponent(scannerId)}`,
    );
    return payload<TicketScannerRow[]>(res, []);
  },

  /** Events the logged-in user can work the door for (organizer or assigned). */
  async scanEvents(): Promise<ScanEventSummary[]> {
    const res = await apiClient.get('/tickets/scan/events');
    return payload<ScanEventSummary[]>(res, []);
  },

  /** Check a ticket in. Verdicts come back as results, not thrown errors. */
  async scanTicket(code: string, eventId?: string): Promise<ScanResult> {
    const res = await apiClient.post('/tickets/scan', { code, eventId });
    return payload<ScanResult>(res, { result: 'NOT_FOUND', code });
  },

  // ───── Public (guest — no auth) ────────────────────────────────────────

  async getPublicEvent(code: string): Promise<PublicTicketEvent | null> {
    try {
      const res = await apiClient.get(`/tickets/public/${encodeURIComponent(code)}`);
      return payload<PublicTicketEvent | null>(res, null);
    } catch {
      return null;
    }
  },

  /** Step 1: price server-side and park a PENDING order. */
  async checkoutTickets(code: string, dto: TicketCheckoutInput): Promise<TicketCheckoutResult> {
    const res = await apiClient.post(`/tickets/public/${encodeURIComponent(code)}/checkout`, dto);
    return payload<TicketCheckoutResult>(res, {} as TicketCheckoutResult);
  },

  /** Step 2: the simulated payment commit — returns the minted ticket codes.
   *  Idempotent: replays return the same tickets. */
  async simulateTicketPayment(reference: string): Promise<PaidTicketOrder> {
    const res = await apiClient.post(
      `/tickets/public/checkout/${encodeURIComponent(reference)}/simulate`,
    );
    return payload<PaidTicketOrder>(res, {} as PaidTicketOrder);
  },
};
