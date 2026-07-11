import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL, tokenManager } from '../services/api/client';
import {
  fetchNotificationCatchUp,
  fetchUnreadNotificationCount,
  type NotificationRecord,
} from '../services/api/notificationService';

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'closed';

export interface QuoteCountUpdate {
  inquiryId: string;
  quoteCount: number;
  reserveCount: number;
  maxQuotes: number;
  reserveCap: number;
}

export interface NotificationStreamHandlers {
  /** Uber dispatch: a matching inquiry just landed for this provider. */
  onNewLead?: (payload: { notificationId: string; inquiryId: string } & Record<string, any>) => void;
  /** Live slot counter tick (ephemeral). */
  onQuoteCountUpdate?: (payload: QuoteCountUpdate) => void;
  /** Primary + reserve both full — retract alerts/cards for this inquiry. */
  onLeadFull?: (payload: { inquiryId: string }) => void;
  /** Buyer: a quote arrived on one of their inquiries. */
  onQuoteReceived?: (payload: Record<string, any>) => void;
  /** Provider: their reserve quote became visible to the buyer. */
  onReserveReleased?: (payload: Record<string, any>) => void;
  /** Buyer: live "X providers accepted" tick (ephemeral). */
  onProviderAccepted?: (payload: { inquiryId: string; acceptedCount: number }) => void;
  /** Stream (re)opened — force a REST resync of anything counter-shaped. */
  onReconnect?: () => void;
}

/**
 * Live dispatch stream (SSE) with reconnect + catch-up.
 *
 * - Native EventSource (auth via ?token= — it cannot set headers). Before
 *   every connect attempt we fire one lightweight authenticated REST call:
 *   apiCall's built-in refresh logic guarantees the token we then read from
 *   tokenManager is fresh, so a reconnect after >1h idle still authenticates.
 * - Hand-rolled backoff (1s → 15s cap). On open: Tier-1 catch-up since the
 *   last seen timestamp, then onReconnect() so callers refetch counters.
 * - Durable (Tier-1) events also arrive through catch-up, so a backend
 *   restart or dropped connection loses nothing; ephemeral counter events
 *   self-heal via the callers' poll fallback.
 */
export function useNotificationStream(
  userId: string | undefined,
  handlers: NotificationStreamHandlers,
): { status: StreamStatus } {
  const [status, setStatus] = useState<StreamStatus>('idle');
  // Handlers live in a ref so a re-render with fresh closures never tears
  // down the connection.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!userId) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    let es: EventSource | null = null;
    let retryTimer: number | undefined;
    let backoff = 1000;
    let lastSeen = new Date().toISOString();

    const routeDurable = (n: Pick<NotificationRecord, 'type'> & { data?: any; id?: string; inquiryId?: string; title?: string }) => {
      const payload = {
        // Order matters: live pushes flatten the snapshot into the event, so
        // `id` there is the INQUIRY id — `notificationId` must win. Catch-up
        // rows are raw Notification records whose `id` IS the notification.
        notificationId: (n as any).notificationId ?? (n as any).id,
        inquiryId: n.inquiryId,
        title: n.title,
        // Catch-up rows carry their Accept/Decline status — consumers skip
        // re-alerting leads already handled (live pushes are implicitly
        // PENDING and carry no status field).
        status: (n as any).status,
        ...(n.data ?? {}),
      };
      if (n.type === 'NEW_LEAD') handlersRef.current.onNewLead?.(payload as any);
      else if (n.type === 'QUOTE_RECEIVED') handlersRef.current.onQuoteReceived?.(payload);
      else if (n.type === 'RESERVE_RELEASED') handlersRef.current.onReserveReleased?.(payload);
    };

    const catchUp = async () => {
      const missed = await fetchNotificationCatchUp(lastSeen);
      lastSeen = new Date().toISOString();
      for (const n of missed) routeDurable(n);
    };

    const parse = (e: MessageEvent): any => {
      try {
        return JSON.parse(e.data);
      } catch {
        return {};
      }
    };

    const connect = async () => {
      if (cancelled) return;
      setStatus('connecting');
      // Freshness ping: apiCall refreshes an expired access token as a side
      // effect, so the token we read next is valid for the SSE handshake.
      await fetchUnreadNotificationCount();
      const token = tokenManager.getAccessToken();
      if (!token || cancelled) {
        setStatus('closed');
        return;
      }

      es = new EventSource(
        `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`,
      );
      es.onopen = () => {
        backoff = 1000;
        setStatus('open');
        catchUp();
        handlersRef.current.onReconnect?.();
      };
      es.addEventListener('new_lead', (e) => {
        lastSeen = new Date().toISOString();
        routeDurable({ type: 'NEW_LEAD', ...parse(e as MessageEvent) });
      });
      es.addEventListener('quote_received', (e) => {
        lastSeen = new Date().toISOString();
        routeDurable({ type: 'QUOTE_RECEIVED', ...parse(e as MessageEvent) });
      });
      es.addEventListener('reserve_released', (e) => {
        lastSeen = new Date().toISOString();
        routeDurable({ type: 'RESERVE_RELEASED', ...parse(e as MessageEvent) });
      });
      es.addEventListener('quote_count_update', (e) => {
        handlersRef.current.onQuoteCountUpdate?.(parse(e as MessageEvent));
      });
      es.addEventListener('lead_full', (e) => {
        handlersRef.current.onLeadFull?.(parse(e as MessageEvent));
      });
      es.addEventListener('provider_accepted', (e) => {
        handlersRef.current.onProviderAccepted?.(parse(e as MessageEvent));
      });
      // heartbeat events need no handler — their arrival keeps proxies from
      // idling the connection out.
      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        setStatus('closed');
        const delay = backoff;
        backoff = Math.min(backoff * 2, 15000);
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      cancelled = true;
      es?.close();
      if (retryTimer) window.clearTimeout(retryTimer);
      setStatus('idle');
    };
  }, [userId]);

  return { status };
}

export default useNotificationStream;
