import { useEffect, useRef, useState } from 'react';
import {
  WifiOff,
  Wifi,
  CloudUpload,
  RefreshCw,
  Check,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getQueuedWrites,
  discardQueuedWrite,
  drainQueue,
  type QueuedWriteItem,
} from '../services/offlineWriteQueue';

/**
 * Global connectivity indicator — mounted once in App.tsx (works pre-auth too;
 * a login attempt needs internet just as much as a dashboard does).
 *
 * Honesty is the point: offline, failed fetches render as "0 / empty", which
 * can read as "no inquiries" when the truth is "no connection". The banner
 * names the state, and on reconnect it nudges every data consumer to refetch:
 *   - 'tonse:inquiries-changed' / 'tonse:quotes-changed' → useInquiries/useQuotes bus
 *   - 'tonse:online' → AuthContext session revalidation, FloatingHub unread count,
 *     and the offline write queue's drainer
 *
 * It also surfaces the OFFLINE WRITE QUEUE: writes made while offline (a new
 * inquiry, a quote, a status change) are held locally and replayed on reconnect.
 * This shows how many are waiting, lets the user retry/discard, and flashes a
 * confirmation when one syncs (or a sticky notice if one is rejected).
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [justBack, setJustBack] = useState(false);
  const backTimerRef = useRef<number | undefined>(undefined);

  const [queue, setQueue] = useState<QueuedWriteItem[]>(() => getQueuedWrites());
  const [expanded, setExpanded] = useState(false);
  const [synced, setSynced] = useState<string | null>(null);
  const syncedTimerRef = useRef<number | undefined>(undefined);
  const [failed, setFailed] = useState<{ label: string; message: string } | null>(null);

  useEffect(() => {
    const handleOffline = () => {
      window.clearTimeout(backTimerRef.current);
      setJustBack(false);
      setOffline(true);
    };
    const handleOnline = () => {
      setOffline(false);
      setJustBack(true);
      // Wake every stale data source now that the network is back. The write
      // queue's drainer self-subscribes to 'tonse:online', so this reconnect
      // also flushes any pending writes.
      window.dispatchEvent(new Event('tonse:online'));
      window.dispatchEvent(new Event('tonse:inquiries-changed'));
      window.dispatchEvent(new Event('tonse:quotes-changed'));
      backTimerRef.current = window.setTimeout(() => setJustBack(false), 3000);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.clearTimeout(backTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const refresh = () => setQueue(getQueuedWrites());
    const onSynced = (e: Event) => {
      const label = (e as CustomEvent<{ label?: string }>).detail?.label;
      setQueue(getQueuedWrites());
      setSynced(label || 'Change');
      window.clearTimeout(syncedTimerRef.current);
      syncedTimerRef.current = window.setTimeout(() => setSynced(null), 3000);
    };
    const onFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ label?: string; message?: string }>).detail;
      setQueue(getQueuedWrites());
      setFailed({
        label: detail?.label || 'Change',
        message: detail?.message || 'The change was rejected.',
      });
    };
    window.addEventListener('tonse:queue-changed', refresh);
    window.addEventListener('tonse:queue-item-synced', onSynced);
    window.addEventListener('tonse:queue-item-failed', onFailed);
    return () => {
      window.removeEventListener('tonse:queue-changed', refresh);
      window.removeEventListener('tonse:queue-item-synced', onSynced);
      window.removeEventListener('tonse:queue-item-failed', onFailed);
      window.clearTimeout(syncedTimerRef.current);
    };
  }, []);

  const hasQueue = queue.length > 0;
  const showConnectivity = offline || justBack;
  if (!showConnectivity && !hasQueue && !synced && !failed) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[240] flex flex-col items-stretch"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Connectivity banner */}
      {showConnectivity && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold text-white shadow-lg ${
            offline ? 'bg-amber-600' : 'bg-emerald-600'
          }`}
        >
          {offline ? (
            <>
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              You're offline — showing your last-loaded view. Reconnecting automatically…
            </>
          ) : (
            <>
              <Wifi className="h-3.5 w-3.5 shrink-0" />
              Back online — refreshing your data.
            </>
          )}
        </div>
      )}

      {/* Pending-sync pill (visible online or offline while writes are queued) */}
      {hasQueue && (
        <div className="bg-slate-800 text-white shadow-lg">
          <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-2"
              aria-expanded={expanded}
            >
              <CloudUpload className="h-3.5 w-3.5 shrink-0" />
              {queue.length} {queue.length === 1 ? 'change' : 'changes'} waiting to sync
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void drainQueue()}
              disabled={offline}
              className="flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 font-semibold hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              Retry now
            </button>
          </div>
          {expanded && (
            <ul className="max-h-48 overflow-y-auto border-t border-white/10 px-4 py-1 text-xs">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-white/90">
                    {item.label}
                    {item.attempts > 0 && (
                      <span className="ml-1 text-white/50">· retried {item.attempts}×</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => discardQueuedWrite(item.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={`Discard ${item.label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Transient "synced" confirmation */}
      {synced && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2 text-center text-xs font-semibold text-white shadow-lg"
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          {synced} synced.
        </div>
      )}

      {/* Sticky "rejected" notice — a hard failure shouldn't vanish silently */}
      {failed && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg"
        >
          <span className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {failed.label} couldn't sync: {failed.message}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setFailed(null)}
            className="shrink-0 rounded px-1.5 py-0.5 hover:bg-white/15"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
