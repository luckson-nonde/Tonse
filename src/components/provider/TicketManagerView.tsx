import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Plus,
  ArrowLeft,
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Link2,
  Check,
  Users,
  Trash2,
  Image as ImageIcon,
  XCircle,
  Crosshair,
  ExternalLink,
  X,
  Share2,
  Copy,
} from 'lucide-react';
import emptyStateImage from '../../assets/images/empty-states/owl_reading.webp';
import { formatCurrency } from '../../utils/financeUtils';
import { compressImage } from '../../utils/compressImage';
import { apiClient, API_BASE_URL } from '../../services/api/client';
import {
  ticketsService,
  ticketRichShareUrl,
  ticketMapsUrl,
  parseCoordinates,
  MyTicketEvent,
  TicketSaleRow,
  TicketEventStatus,
} from '../../services/api/ticketsService';
import { searchZambiaPlaces, ZambiaPlace } from '../../utils/zambiaPlaces';
import DateTimePicker from '../DateTimePicker';
import Button from '../Button';

const STATUS_STYLE: Record<TicketEventStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-400 border border-slate-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  CANCELLED: 'bg-rose-50 text-rose-600 border border-rose-100',
};

const STATUS_LABEL: Record<TicketEventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'On sale',
  CANCELLED: 'Cancelled',
};

const prettyDateTime = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) +
        ' · ' +
        d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

interface TierRow {
  name: string;
  price: string;
  quantity: string;
}

const EMPTY_TIER: TierRow = { name: '', price: '', quantity: '' };

function FieldNote({ error, help }: { error?: string; help?: string }) {
  if (error) return <p className="mt-1 text-[11px] font-semibold text-rose-500 normal-case tracking-normal">{error}</p>;
  if (help) return <p className="mt-1 text-[11px] text-slate-400 normal-case tracking-normal font-medium">{help}</p>;
  return null;
}

/**
 * Seller "Ticket Manager" surface — events-category sellers create an event
 * with priced ticket tiers, share the public `/e/:code` link anywhere, and
 * watch sales land. Ticket money (minus the platform commission) is credited
 * to the venture balance the moment a guest completes the (simulated) payment.
 */
export default function TicketManagerView() {
  const [events, setEvents] = useState<MyTicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<'list' | 'create' | 'sales'>('list');

  // Create-event form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterPreview, setPosterPreview] = useState('');
  // Exact venue pin — set by picking a suggested place, GPS capture, or a
  // pasted maps link; rides onto the digital ticket as "open in Google Maps".
  const [pin, setPin] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [pinText, setPinText] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Venue typeahead — as the seller types, suggest matching Zambian places
  // (the seller often isn't AT the venue and doesn't know coordinates, so
  // picking a suggestion is the primary way the pin gets set).
  const [venueSuggestions, setVenueSuggestions] = useState<ZambiaPlace[]>([]);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [venueSearching, setVenueSearching] = useState(false);
  const [venueSearched, setVenueSearched] = useState(false);
  const venueSearchTimeoutRef = useRef<number | null>(null);
  const venueSearchAbortRef = useRef<AbortController | null>(null);
  const [tiers, setTiers] = useState<TierRow[]>([{ ...EMPTY_TIER }]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sales detail state
  const [salesEvent, setSalesEvent] = useState<MyTicketEvent | null>(null);
  const [sales, setSales] = useState<TicketSaleRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const [copiedCode, setCopiedCode] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEvents(await ticketsService.listMyEvents());
    } catch (e: any) {
      setError(e?.message || 'Failed to load your events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVenue('');
    setEventDate('');
    setPosterUrl('');
    setPosterPreview('');
    setPin(null);
    setPinText('');
    setGeoError('');
    setTiers([{ ...EMPTY_TIER }]);
    setFormError('');
    setFieldErrors({});
  };

  // Debounce lives in the change handler, NOT a useEffect on `venue` —
  // picking a suggestion calls setVenue directly and must never re-trigger
  // a search of its own output (same rule as LocationDetails).
  const handleVenueChange = (value: string) => {
    setVenue(value);
    setFieldErrors((x) => ({ ...x, venue: '' }));
    setShowVenueSuggestions(true);
    setVenueSearched(false);

    if (venueSearchTimeoutRef.current !== null) {
      window.clearTimeout(venueSearchTimeoutRef.current);
    }
    venueSearchAbortRef.current?.abort();

    if (value.trim().length < 3) {
      setVenueSuggestions([]);
      setVenueSearching(false);
      return;
    }
    setVenueSearching(true);
    venueSearchTimeoutRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      venueSearchAbortRef.current = controller;
      const results = await searchZambiaPlaces(value, controller.signal);
      if (controller.signal.aborted) return;
      setVenueSuggestions(results);
      setVenueSearching(false);
      setVenueSearched(true);
    }, 400);
  };

  /** Picking a place fills the field AND pins its coordinates — the seller
   *  doesn't need to be there or know the GPS numbers. */
  const handlePickVenue = (place: ZambiaPlace) => {
    setVenue(place.detail ? `${place.name}, ${place.detail}` : place.name);
    setPin({ latitude: place.latitude, longitude: place.longitude });
    setPinText('');
    setGeoError('');
    setVenueSuggestions([]);
    setShowVenueSuggestions(false);
  };

  // Cancel any in-flight venue search when the view unmounts.
  useEffect(
    () => () => {
      if (venueSearchTimeoutRef.current !== null) {
        window.clearTimeout(venueSearchTimeoutRef.current);
      }
      venueSearchAbortRef.current?.abort();
    },
    [],
  );

  /**
   * Capture the venue pin at the best accuracy the device gives us —
   * watchPosition keeps collecting while the GPS chip refines its lock
   * (getCurrentPosition's first fix is often Wi-Fi-coarse), accepting early
   * at ≤25m or committing the best reading after 12s. Same approach as
   * LocationDetails' onboarding pin.
   */
  const handleUseMyLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Location is not supported by this browser — paste a Google Maps link instead.');
      return;
    }
    setLocating(true);
    let best: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;

    const commit = (position: GeolocationPosition | null) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setLocating(false);
      if (!position) {
        setGeoError('Could not read your location — allow location access, or paste a Google Maps link.');
        return;
      }
      setPin({
        latitude: Number(position.coords.latitude.toFixed(7)),
        longitude: Number(position.coords.longitude.toFixed(7)),
        accuracy: Math.round(position.coords.accuracy),
      });
      setPinText('');
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
        if (position.coords.accuracy <= 25) commit(position);
      },
      () => {
        if (!best) commit(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
    window.setTimeout(() => commit(best), 12000);
  };

  /** Accept "lat, lng" or a pasted Google Maps link. */
  const handlePinTextChange = (raw: string) => {
    setPinText(raw);
    setGeoError('');
    const parsed = parseCoordinates(raw);
    if (parsed) setPin(parsed);
  };

  const handlePosterChange = async (file: File | null) => {
    if (!file) return;
    setFormError('');
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed, file.name);
      const response = await apiClient.post<{ url: string }>('/files/upload?category=event-media', formData);
      const url = response.data?.url;
      if (!url) throw new Error('Upload did not return a file URL');
      // Store ABSOLUTE, like every other upload in the app — the frontend is
      // a separate origin from the API in production.
      setPosterUrl(`${API_BASE_URL}${url}`);
      setPosterPreview(URL.createObjectURL(file));
    } catch (e: any) {
      setFormError(e?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const setTier = (index: number, patch: Partial<TierRow>) => {
    setFieldErrors((x) => ({ ...x, tiers: '' }));
    setTiers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleCreate = async () => {
    setFormError('');
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Give your event a name.';
    if (!description.trim()) errs.description = 'Tell people what the event is.';
    if (!venue.trim()) errs.venue = 'Where is it happening?';
    if (!eventDate) errs.eventDate = 'Pick the event date and time.';

    const cleanTiers = tiers
      .map((t) => ({
        name: t.name.trim(),
        priceZmw: Number(t.price),
        totalQuantity: Number(t.quantity),
      }))
      .filter((t) => t.name || t.priceZmw || t.totalQuantity);
    if (cleanTiers.length === 0) {
      errs.tiers = 'Add at least one ticket type.';
    } else if (
      cleanTiers.some(
        (t) =>
          !t.name ||
          !Number.isFinite(t.priceZmw) ||
          t.priceZmw < 0 ||
          !Number.isInteger(t.totalQuantity) ||
          t.totalQuantity < 1,
      )
    ) {
      errs.tiers = 'Every ticket type needs a name, a price (0 or more) and a whole-number quantity of at least 1.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCreating(true);
    try {
      await ticketsService.createEvent({
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        eventDate,
        posterUrl: posterUrl || undefined,
        latitude: pin?.latitude,
        longitude: pin?.longitude,
        tiers: cleanTiers,
      });
      resetForm();
      setView('list');
      await load();
    } catch (e: any) {
      setFormError(e?.message || 'Could not create the event. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  /** Native share sheet (WhatsApp / Facebook / SMS …) with the decorated
   *  link. Falls back to copy where the Web Share API doesn't exist
   *  (mostly desktop browsers). */
  const handleShare = async (event: MyTicketEvent) => {
    const url = ticketRichShareUrl(event.code);
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({
          title: event.title,
          text: `${event.title} — ${prettyDateTime(event.eventDate)} at ${event.venue}. Get your tickets:`,
          url,
        });
        return;
      } catch (e: any) {
        // User dismissed the sheet — not a failure, and not a cue to copy.
        if (e?.name === 'AbortError') return;
      }
    }
    await handleCopyLink(event.code);
  };

  const handleCopyLink = async (code: string) => {
    // Copy the DECORATED link too — pasted into WhatsApp it unfurls with the
    // poster and event details, then redirects buyers to the ticket page.
    const url = ticketRichShareUrl(code);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API can be unavailable (http, older WebView) — fall back to
      // the old textarea trick so "Copy" never silently does nothing.
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(''), 2000);
  };

  const openSales = async (event: MyTicketEvent) => {
    setSalesEvent(event);
    setView('sales');
    setSalesLoading(true);
    try {
      setSales(await ticketsService.salesForEvent(event.id));
    } catch (e: any) {
      setError(e?.message || 'Failed to load sales.');
    } finally {
      setSalesLoading(false);
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    setCancellingId(eventId);
    setError('');
    try {
      await ticketsService.cancelEvent(eventId);
      setConfirmCancelId('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not cancel the event.');
    } finally {
      setCancellingId('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl px-4 py-3 text-[12px] font-semibold">
          {error}
        </div>
      )}

      {/* ── Sales / attendee detail ── */}
      {view === 'sales' && salesEvent && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setView('list'); setSalesEvent(null); }} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 truncate">{salesEvent.title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">Ticket sales & attendees</p>
            </div>
          </div>

          {salesLoading ? (
            <div className="flex items-center justify-center py-14 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <p className="text-[13px] text-slate-400 font-medium py-8 text-center">
              No tickets sold yet — share your event link to start selling.
            </p>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-slate-900 truncate">{sale.buyerName}</p>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {sale.buyerPhone || sale.buyerEmail || '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-[13px] text-slate-900">ZMW {formatCurrency(sale.totalAmountZmw)}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">ZMW {formatCurrency(sale.netZmw)} to you</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <TicketIcon className="w-3 h-3 text-[#C9973A]" />
                      {sale.lineItems.map((li) => `${li.quantity}× ${li.tierName}`).join(', ')}
                    </span>
                    <span>{prettyDateTime(sale.purchasedAt)}</span>
                    <span className="text-slate-300">{sale.reference}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create-event form ── */}
      {view === 'create' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setView('list'); resetForm(); }} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-black text-slate-900">New ticketed event</h3>
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Event name
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setFieldErrors((x) => ({ ...x, title: '' })); }}
              placeholder="e.g. Lusaka Rooftop Sunset Concert"
              className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-[13px] font-medium text-slate-900 tracking-normal normal-case focus:outline-none ${
                fieldErrors.title ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-[#C9973A]'
              }`}
            />
            <FieldNote error={fieldErrors.title} help="The headline on your public ticket page." />
          </label>

          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Description
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setFieldErrors((x) => ({ ...x, description: '' })); }}
              rows={4}
              placeholder="What's happening, who's performing, what's included…"
              className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-[13px] font-medium text-slate-900 tracking-normal normal-case focus:outline-none resize-none ${
                fieldErrors.description ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-[#C9973A]'
              }`}
            />
            <FieldNote error={fieldErrors.description} />
          </label>

          {/* Venue search-as-you-type: matching Zambian places drop down as
              the seller types ("Makeni" → every related place); picking one
              fills the field AND pins the exact coordinates, so they never
              need to be on-site or know GPS numbers. Free typing still works
              for venues the map doesn't know. */}
          <div className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Venue / location
            <div className="relative">
              <input
                value={venue}
                onChange={(e) => handleVenueChange(e.target.value)}
                onFocus={() => {
                  if (venueSuggestions.length > 0 || venueSearched) setShowVenueSuggestions(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowVenueSuggestions(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowVenueSuggestions(false);
                }}
                autoComplete="off"
                placeholder="Start typing — e.g. Makeni, Manda Hill, Levy Junction…"
                className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-[13px] font-medium text-slate-900 tracking-normal normal-case focus:outline-none ${
                  fieldErrors.venue ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-[#C9973A]'
                }`}
              />
              {venueSearching && (
                <div className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9973A]" />
                </div>
              )}

              {showVenueSuggestions &&
                (venueSuggestions.length > 0 ||
                  (venueSearched && !venueSearching && venueSuggestions.length === 0)) && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {venueSuggestions.length > 0 ? (
                      venueSuggestions.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handlePickVenue(place)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#faf6ee] transition-colors border-b border-slate-50 last:border-b-0 cursor-pointer"
                        >
                          <p className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900 tracking-normal normal-case truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#C9973A] shrink-0" />
                            {place.name}
                          </p>
                          {place.detail && (
                            <p className="text-[11px] text-slate-400 tracking-normal normal-case font-medium truncate pl-5">
                              {place.detail}
                            </p>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-2.5 text-[12px] text-slate-400 tracking-normal normal-case font-medium">
                        No Zambian places match — keep typing, or enter the venue name freely.
                      </p>
                    )}
                  </div>
                )}
            </div>
            <FieldNote
              error={fieldErrors.venue}
              help="Pick a suggestion to pin the exact spot automatically — shown to everyone who opens your ticket link."
            />
          </div>

          {/* Exact location pin — lands on the digital ticket as a tappable
              "open in Google Maps" so attendees can navigate to the venue. */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Exact location pin
            </p>
            {pin ? (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-emerald-700 truncate">
                    Pinned {pin.latitude}, {pin.longitude}
                    {pin.accuracy != null && (
                      <span className="font-medium text-emerald-600"> · ±{pin.accuracy}m</span>
                    )}
                  </p>
                  <a
                    href={ticketMapsUrl(pin) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline underline-offset-2"
                  >
                    <ExternalLink className="w-3 h-3" /> Verify on Google Maps
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => { setPin(null); setPinText(''); }}
                  aria-label="Remove pin"
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-[#C9973A] hover:text-[#C9973A] transition-colors disabled:opacity-60"
                >
                  {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                  {locating ? 'Pinning your position…' : 'Use my current location'}
                </button>
                <input
                  value={pinText}
                  onChange={(e) => handlePinTextChange(e.target.value)}
                  placeholder="…or paste a Google Maps link / -15.4166, 28.2833"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-900 focus:outline-none focus:border-[#C9973A]"
                />
              </div>
            )}
            <FieldNote
              error={geoError}
              help={pin ? undefined : 'Buyers tap the location on their ticket to open Google Maps and navigate straight to your venue.'}
            />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Date & time</p>
            <DateTimePicker
              value={eventDate}
              onChange={(v) => { setEventDate(v); setFieldErrors((x) => ({ ...x, eventDate: '' })); }}
              mode="datetime"
              error={!!fieldErrors.eventDate}
            />
            <FieldNote error={fieldErrors.eventDate} />
          </div>

          {/* Poster (optional) */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Poster (optional)</p>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePosterChange(e.target.files?.[0] ?? null)}
              />
              {posterPreview ? (
                <img
                  src={posterPreview}
                  alt="Event poster preview"
                  className="w-full max-h-64 object-cover rounded-2xl border border-slate-200"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-10 text-slate-400 hover:border-[#C9973A] hover:text-[#C9973A] transition-colors">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  <span className="text-[11px] font-bold uppercase tracking-widest">
                    {uploading ? 'Uploading…' : 'Upload a poster image'}
                  </span>
                </div>
              )}
            </label>
          </div>

          {/* Ticket tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Ticket types</p>
              <button
                type="button"
                onClick={() => setTiers((rows) => [...rows, { ...EMPTY_TIER }])}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C9973A] hover:text-[#b07f24]"
              >
                <Plus className="w-3.5 h-3.5" /> Add type
              </button>
            </div>
            <div className="space-y-2.5">
              {tiers.map((tier, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
                    <input
                      value={tier.name}
                      onChange={(e) => setTier(index, { name: e.target.value })}
                      placeholder="Name (e.g. Standard, VIP)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 focus:outline-none focus:border-[#C9973A]"
                    />
                    <input
                      value={tier.price}
                      onChange={(e) => setTier(index, { price: e.target.value })}
                      inputMode="decimal"
                      placeholder="Price (ZMW)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 focus:outline-none focus:border-[#C9973A]"
                    />
                    <input
                      value={tier.quantity}
                      onChange={(e) => setTier(index, { quantity: e.target.value })}
                      inputMode="numeric"
                      placeholder="Quantity"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 focus:outline-none focus:border-[#C9973A]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTiers((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))}
                    disabled={tiers.length <= 1}
                    className="p-2.5 mt-0.5 text-slate-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove ticket type"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <FieldNote
              error={fieldErrors.tiers}
              help="Each type has its own price and its own number of tickets on sale."
            />
          </div>

          {formError && (
            <p className="text-[12px] font-semibold text-rose-500">{formError}</p>
          )}

          <Button
            onClick={handleCreate}
            disabled={creating || uploading}
            className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TicketIcon className="w-3.5 h-3.5" />}
            Publish event & get share link
          </Button>
          <p className="text-[11px] text-slate-400 font-medium text-center">
            Your event goes live immediately. Ticket money (minus the platform fee) lands in your
            Financial Account as each ticket is bought.
          </p>
        </div>
      )}

      {/* ── Event list ── */}
      {view === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900">Your events</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Sell tickets through a link you can share anywhere.
              </p>
            </div>
            <Button
              onClick={() => setView('create')}
              className="px-4 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New event
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-12 flex flex-col items-center text-center gap-3">
              <img src={emptyStateImage} alt="" className="w-28 h-28 object-contain" />
              <p className="font-bold text-slate-700 text-[14px]">No events yet</p>
              <p className="text-[12px] text-slate-400 font-medium max-w-xs">
                Create your first event, set your ticket types, and share the link — buyers don't
                even need an account to pay.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const shareUrl = ticketRichShareUrl(event.code);
                const mapsUrl = ticketMapsUrl(event);
                return (
                  <div key={event.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    {event.posterUrl && (
                      <img src={event.posterUrl} alt="" className="w-full h-40 object-cover" />
                    )}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-900 text-[15px] truncate">{event.title}</h4>
                          <div className="mt-1 space-y-0.5 text-[11px] text-slate-500 font-medium">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-[#C9973A]" /> {prettyDateTime(event.eventDate)}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-[#C9973A]" /> {event.venue}
                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[#a97c27] font-bold hover:underline underline-offset-2"
                                >
                                  <ExternalLink className="w-3 h-3" /> Map
                                </a>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[event.status]}`}>
                          {STATUS_LABEL[event.status]}
                        </span>
                      </div>

                      {/* Tier stock */}
                      <div className="flex flex-wrap gap-2">
                        {event.tiers.map((tier) => (
                          <span key={tier.id} className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-600">
                            {tier.name} · ZMW {formatCurrency(tier.priceZmw)} ·{' '}
                            <span className={tier.remainingQuantity === 0 ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                              {tier.remainingQuantity === 0
                                ? 'Sold out'
                                : `${tier.remainingQuantity}/${tier.totalQuantity} left`}
                            </span>
                          </span>
                        ))}
                      </div>

                      {/* Sales summary */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sold</p>
                          <p className="font-black text-slate-900 text-[15px]">{event.ticketsSold}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gross</p>
                          <p className="font-black text-slate-900 text-[15px]">K{formatCurrency(event.grossZmw)}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Yours</p>
                          <p className="font-black text-emerald-600 text-[15px]">K{formatCurrency(event.netZmw)}</p>
                        </div>
                      </div>

                      {/* Share link — Share opens the native sheet (WhatsApp,
                          Facebook, SMS…) with the decorated preview link;
                          Copy grabs the same link for manual pasting. */}
                      {event.status === 'PUBLISHED' && (
                        <div className="flex items-center gap-2 rounded-2xl bg-[#fdf6e9] border border-[#ecd9b3] px-3.5 py-2.5">
                          <Link2 className="w-3.5 h-3.5 text-[#b07f24] shrink-0" />
                          <p className="flex-1 min-w-0 truncate text-[12px] font-semibold text-[#b07f24]">{shareUrl}</p>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(event.code)}
                            aria-label="Copy link"
                            className="shrink-0 p-2 rounded-xl text-[#b07f24] hover:bg-[#ecd9b3] transition-colors"
                          >
                            {copiedCode === event.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(event)}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#C9973A] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#b07f24] transition-colors"
                          >
                            <Share2 className="w-3 h-3" /> Share
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSales(event)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" /> Sales & attendees
                        </button>
                        {event.status === 'PUBLISHED' &&
                          (confirmCancelId === event.id ? (
                            <button
                              type="button"
                              onClick={() => handleCancelEvent(event.id)}
                              disabled={cancellingId === event.id}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors disabled:opacity-50"
                            >
                              {cancellingId === event.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              Confirm — stop sales
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelId(event.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-rose-200 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel event
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
