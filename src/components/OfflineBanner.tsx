import { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * Global connectivity indicator — mounted once in App.tsx (works pre-auth too;
 * a login attempt needs internet just as much as a dashboard does).
 *
 * Honesty is the point: offline, failed fetches render as "0 / empty", which
 * can read as "no inquiries" when the truth is "no connection". The banner
 * names the state, and on reconnect it nudges every data consumer to refetch:
 *   - 'tonse:inquiries-changed' / 'tonse:quotes-changed' → useInquiries/useQuotes bus
 *   - 'tonse:online' → AuthContext session revalidation, FloatingHub unread count
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [justBack, setJustBack] = useState(false);
  const backTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleOffline = () => {
      window.clearTimeout(backTimerRef.current);
      setJustBack(false);
      setOffline(true);
    };
    const handleOnline = () => {
      setOffline(false);
      setJustBack(true);
      // Wake every stale data source now that the network is back.
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

  if (!offline && !justBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[240] flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold text-white shadow-lg ${
        offline ? 'bg-amber-600' : 'bg-emerald-600'
      }`}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
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
  );
}
