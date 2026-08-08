import { apiClient } from './client';

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
  status: TicketEventStatus;
  createdAt: string;
  updatedAt: string;
  tiers: TicketTierSummary[];
  ticketsSold: number;
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
  totalAmountZmw: number;
  netZmw: number;
  purchasedAt: string;
}

/** What a guest sees on the share link. */
export interface PublicTicketEvent {
  code: string;
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  posterUrl: string | null;
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
  totalAmountZmw: number;
  tickets: Array<{ code: string; tierName: string }>;
}

/** The share URL a seller copies — same origin the app is served from. */
export function ticketShareUrl(code: string): string {
  return `${window.location.origin}/e/${encodeURIComponent(code)}`;
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
