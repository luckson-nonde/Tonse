import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket as TicketIcon,
  Check,
  X,
  AlertTriangle,
  ScanLine,
  Keyboard,
  UserCheck,
  ShieldCheck,
  CameraOff,
} from 'lucide-react';
import Logo from '../components/Logo';
import {
  ticketsService,
  ScanEventSummary,
  ScanResult,
} from '../services/api/ticketsService';

const prettyDateTime = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) +
        ' · ' +
        d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const prettyTime = (value: string | null | undefined) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/**
 * The door — `/scan`. Organizers and their assigned door team (any logged-in
 * user whose email the organizer added) pick an event, then scan attendees'
 * QR tickets with the camera (typed codes work as a fallback). Every scan
 * flips the ticket VALID → REDEEMED on the backend, so a code can only ever
 * admit one person once — and the organizer's attendance count updates live.
 */
export default function TicketScanPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<ScanEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<ScanEventSummary | null>(null);

  const [result, setResult] = useState<ScanResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Blocks the camera's rapid-fire decode callbacks from double-submitting
  // the same code while a scan is in flight or a verdict is on screen.
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEvents(await ticketsService.scanEvents());
    } catch (e: any) {
      setError(e?.message || 'Could not load your events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshCounts = useCallback(async (eventId: string) => {
    try {
      const fresh = await ticketsService.scanEvents();
      setEvents(fresh);
      const updated = fresh.find((e) => e.id === eventId);
      if (updated) setActive(updated);
    } catch {
      // Counts are cosmetic here — never break the scan flow over them.
    }
  }, []);

  const handleScan = useCallback(
    async (rawCode: string, eventId: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setChecking(true);
      try {
        const verdict = await ticketsService.scanTicket(rawCode.trim(), eventId);
        setResult(verdict);
        if (verdict.result === 'ADMITTED') refreshCounts(eventId);
      } catch (e: any) {
        setResult({ result: 'NOT_FOUND', code: rawCode.trim() });
        setError(e?.message || '');
      } finally {
        setChecking(false);
      }
    },
    [refreshCounts],
  );

  // Camera lifecycle — start when an event is selected, stop when it isn't.
  // The div it mounts into only exists while `active` is set.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const scanner = new Html5Qrcode('ticket-qr-reader');
    scannerRef.current = scanner;
    setCameraError(false);

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => handleScan(decoded, active.id),
        () => {
          /* per-frame decode misses are normal — ignore */
        },
      )
      .catch(() => {
        if (!cancelled) setCameraError(true);
      });

    return () => {
      cancelled = true;
      scannerRef.current = null;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {
          /* was never started (permission denied) — nothing to stop */
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const handleNext = () => {
    setResult(null);
    setManualCode('');
    busyRef.current = false;
  };

  const handleManualSubmit = () => {
    if (!active || !manualCode.trim() || busyRef.current) return;
    handleScan(manualCode, active.id);
  };

  const verdictView = (r: ScanResult) => {
    const styles: Record<
      ScanResult['result'],
      { bg: string; iconBg: string; icon: ReactNode; title: string; note: string }
    > = {
      ADMITTED: {
        bg: 'bg-emerald-500',
        iconBg: 'bg-white/20',
        icon: <Check className="w-10 h-10 text-white" />,
        title: 'ADMIT',
        note: 'Ticket is valid — welcome them in.',
      },
      ALREADY_USED: {
        bg: 'bg-rose-500',
        iconBg: 'bg-white/20',
        icon: <X className="w-10 h-10 text-white" />,
        title: 'ALREADY SCANNED',
        note: `This ticket was checked in${r.checkedInAt ? ` at ${prettyTime(r.checkedInAt)}` : ' earlier'}.`,
      },
      VOID: {
        bg: 'bg-rose-500',
        iconBg: 'bg-white/20',
        icon: <X className="w-10 h-10 text-white" />,
        title: 'VOID TICKET',
        note: 'This ticket was cancelled — do not admit.',
      },
      NOT_FOUND: {
        bg: 'bg-slate-600',
        iconBg: 'bg-white/20',
        icon: <AlertTriangle className="w-10 h-10 text-white" />,
        title: 'NOT A TICKET',
        note: 'No ticket matches this code.',
      },
      WRONG_EVENT: {
        bg: 'bg-amber-500',
        iconBg: 'bg-white/20',
        icon: <AlertTriangle className="w-10 h-10 text-white" />,
        title: 'WRONG EVENT',
        note: r.eventTitle ? `This ticket is for "${r.eventTitle}".` : 'This ticket is for a different event.',
      },
    };
    const s = styles[r.result];
    return (
      <div className={`rounded-3xl ${s.bg} p-6 flex flex-col items-center text-center gap-3 text-white`}>
        <div className={`w-20 h-20 rounded-full ${s.iconBg} flex items-center justify-center`}>{s.icon}</div>
        <p className="font-black text-2xl tracking-widest">{s.title}</p>
        <p className="font-mono font-bold tracking-[0.25em] text-[15px] opacity-90">{r.code}</p>
        {r.result === 'ADMITTED' && (
          <div className="bg-white/15 rounded-2xl px-5 py-3 space-y-0.5">
            <p className="font-black text-[16px] flex items-center gap-2 justify-center">
              <UserCheck className="w-4 h-4" /> {r.buyerName}
            </p>
            <p className="text-[12px] font-bold uppercase tracking-widest opacity-90">{r.tierName}</p>
          </div>
        )}
        {r.result === 'ALREADY_USED' && r.buyerName && (
          <p className="text-[13px] font-semibold opacity-90">
            Sold to {r.buyerName} · {r.tierName}
          </p>
        )}
        <p className="text-[12px] font-medium opacity-90 max-w-xs">{s.note}</p>
        <button
          type="button"
          onClick={handleNext}
          className="mt-1 w-full py-3.5 rounded-2xl bg-white text-slate-900 font-black uppercase tracking-widest text-[11px] hover:bg-slate-100 transition-colors"
        >
          Scan next ticket
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (active ? setActive(null) : navigate(-1))}
            aria-label="Back"
            className="text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Logo className="text-2xl" />
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300">
          <ScanLine className="w-3.5 h-3.5" /> Door check-in
        </span>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-0 mt-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !active ? (
          /* ── Event picker ── */
          <>
            <div>
              <h1 className="font-black text-slate-900 text-lg">Whose door are you working?</h1>
              <p className="text-[12px] text-slate-400 font-medium">
                Your own events, plus any event where the organizer added you to the door team.
              </p>
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl px-4 py-3 text-[12px] font-semibold">
                {error}
              </div>
            )}
            {events.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-12 flex flex-col items-center text-center gap-3">
                <TicketIcon className="w-8 h-8 text-slate-200" />
                <p className="font-bold text-slate-700 text-[14px]">No events to scan for</p>
                <p className="text-[12px] text-slate-400 font-medium max-w-xs">
                  Create an event in your Ticket Manager, or ask an organizer to add your account
                  email ({/* the email they must assign */}the one you log in with) to their door team.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setActive(event)}
                    className="w-full text-left bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:border-[#C9973A] transition-colors"
                  >
                    {event.posterUrl && (
                      <img src={event.posterUrl} alt="" className="w-full h-24 object-cover" />
                    )}
                    <div className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-900 text-[14px] leading-tight">{event.title}</p>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            event.role === 'ORGANIZER'
                              ? 'bg-[#fdf6e9] text-[#b07f24] border border-[#ecd9b3]'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {event.role === 'ORGANIZER' ? 'Your event' : 'Door team'}
                        </span>
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Calendar className="w-3 h-3 text-[#C9973A]" /> {prettyDateTime(event.eventDate)}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                        <MapPin className="w-3 h-3 text-[#C9973A]" /> {event.venue}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-600">
                        {event.checkedIn} of {event.ticketsSold} attendees checked in
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Scanner for the selected event ── */
          <>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-2">
              <p className="font-black text-slate-900 text-[15px] leading-tight">{active.title}</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400 font-medium">
                  {prettyDateTime(active.eventDate)}
                </p>
                <p className="text-[12px] font-black text-emerald-600 shrink-0">
                  {active.checkedIn} / {active.ticketsSold} in
                </p>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${active.ticketsSold ? Math.min(100, (active.checkedIn / active.ticketsSold) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {result ? (
              verdictView(result)
            ) : (
              <>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {cameraError ? (
                    <div className="px-6 py-10 flex flex-col items-center text-center gap-2 text-slate-400">
                      <CameraOff className="w-7 h-7" />
                      <p className="text-[13px] font-bold text-slate-600">Camera unavailable</p>
                      <p className="text-[11px] font-medium max-w-xs">
                        Allow camera access to scan QR codes — or type the ticket code below.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* html5-qrcode renders its video feed into this div */}
                      <div id="ticket-qr-reader" className="w-full [&_video]:w-full" />
                      <p className="px-5 py-3 text-center text-[11px] text-slate-400 font-medium">
                        {checking ? (
                          <span className="inline-flex items-center gap-2 text-[#b07f24] font-bold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking ticket…
                          </span>
                        ) : (
                          <>Point the camera at the attendee's QR code.</>
                        )}
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <Keyboard className="w-3.5 h-3.5" /> Or type the code
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                      placeholder="TIX-XXXXXX"
                      autoCapitalize="characters"
                      autoComplete="off"
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] font-bold tracking-widest text-slate-900 focus:outline-none focus:border-[#C9973A]"
                    />
                    <button
                      type="button"
                      onClick={handleManualSubmit}
                      disabled={!manualCode.trim() || checking}
                      className="shrink-0 px-4 rounded-xl bg-[#1B3068] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-[#142450] transition-colors"
                    >
                      Check in
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
