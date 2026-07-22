import React, { useState, useRef } from 'react';
import {
  MapPin,
  ChevronDown,
  Globe,
  Map,
  Building2,
  Navigation,
  ChevronLeft,
  Sparkles,
  Lock,
  Truck,
  AlertCircle,
  Check,
  Store,
  Loader2,
} from 'lucide-react';

interface LocationDetailsProps {
  onBack?: () => void;
  onComplete: (data: {
    province: string;
    city: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => void;
  submitLabel?: string;
  showRadius?: boolean;
  isStandalone?: boolean;
  /** When false, the GPS-capture "Pinpoint" section (and the registration
   *  "Be at your shop" advisory) is hidden and coordinates are stripped from
   *  the onComplete payload. Buyer registration passes this — a buyer only
   *  pins a precise point per-inquiry, not at signup. Sellers/providers and
   *  the inquiry flow leave it at the default (true). */
  showGps?: boolean;
  /** When true, the consuming layout (e.g. RegistrationStepShell)
   *  already renders the eyebrow / title / description / tips / "be
   *  at your shop" advisory in its left context panel. The form
   *  body should skip those inline blocks to avoid duplication. */
  embeddedInShell?: boolean;
  /** Pre-fill values on (re)mount. Used by the registration wizard so
   *  navigating back to the Location step restores what the user already
   *  entered instead of showing an empty form. Absent → starts blank
   *  (unchanged behaviour for the inquiry flow). */
  initialValue?: {
    province?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  };
}

const ZAMBIA_DATA: Record<string, string[]> = {
  Central: [
    'Kabwe',
    'Kapiri Mposhi',
    'Mkushi',
    'Mumbwa',
    'Serenje',
    'Chibombo',
    'Chisamba',
    'Luano',
    'Ngabwe',
    'Shibuyunji',
  ],
  Copperbelt: [
    'Ndola',
    'Kitwe',
    'Chingola',
    'Mufulira',
    'Luanshya',
    'Kalulushi',
    'Chililabombwe',
    'Mpongwe',
    'Lufwanyama',
    'Masilémbo',
  ],
  Eastern: [
    'Chipata',
    'Petauke',
    'Lundazi',
    'Katete',
    'Nyimba',
    'Sinda',
    'Chadiza',
    'Vubwi',
    'Mambwe',
    'Chasefu',
    'Lumezi',
    'Kasenengwa',
  ],
  Luapula: [
    'Mansa',
    'Nchelenge',
    'Kawambwa',
    'Samfya',
    'Mwense',
    'Chembe',
    'Chiengi',
    'Lunga',
    'Milenge',
    'Mwansabombwe',
    'Chifunabuli',
  ],
  Lusaka: ['Lusaka', 'Kafue', 'Chongwe', 'Rufunsa', 'Chilanga', 'Luangwa', 'Chirundu'],
  Muchinga: [
    'Chinsali',
    'Mpika',
    'Nakonde',
    'Isoka',
    'Mafinga',
    "Shiwa Ng'andu",
    'Kanchibiya',
    'Lavushimanda',
  ],
  Northern: [
    'Kasama',
    'Mbala',
    'Mporokoso',
    'Luwingu',
    'Mungwi',
    'Kaputa',
    'Senga Hill',
    'Lunte',
    'Nsama',
  ],
  'North-Western': [
    'Solwezi',
    'Mwinilunga',
    'Zambezi',
    'Kabompo',
    'Mufumbwe',
    'Chavuma',
    'Kasempa',
    'Ikelenge',
    'Manyinga',
    'Mushindamo',
    'Kalumbila',
  ],
  Southern: [
    'Livingstone',
    'Choma',
    'Mazabuka',
    'Monze',
    'Kalomo',
    'Namwala',
    'Pemba',
    'Zimba',
    'Sinazongwe',
    'Gwembe',
    'Kazungula',
    'Chikankata',
    'Bweengwa',
  ],
  Western: [
    'Mongu',
    'Kaoma',
    'Senanga',
    'Sesheke',
    'Lukulu',
    'Kalabo',
    "Shang'ombo",
    'Sikongo',
    'Sioma',
    'Mitete',
    'Nkeyema',
    'Mulobezi',
    'Limulunga',
    'Luampa',
    'Mwandi',
    'Nalolo',
  ],
};

// Zambia approximate bounding box — used to reject foreign coordinates
// before we even hit the geocoder.
const ZAMBIA_BOUNDS = { minLat: -18.1, maxLat: -8.2, minLng: 21.9, maxLng: 33.7 };

function isInZambia(lat: number, lng: number): boolean {
  return (
    lat >= ZAMBIA_BOUNDS.minLat &&
    lat <= ZAMBIA_BOUNDS.maxLat &&
    lng >= ZAMBIA_BOUNDS.minLng &&
    lng <= ZAMBIA_BOUNDS.maxLng
  );
}

interface ZambiaAddressMatch {
  province: string | null;
  city: string | null;
  rawLocality: string;
  rawState: string;
}

/**
 * Match a Nominatim `address` object (identical shape from /reverse and
 * /search) against ZAMBIA_DATA so results populate the province/city
 * selects with values they actually recognise. Shared by reverseGeocode
 * (GPS capture) and forwardGeocode (Area/Landmark search).
 */
function matchZambiaAddress(addr: any): ZambiaAddressMatch {
  // Province: Nominatim returns "Lusaka Province" — strip the suffix.
  const stateRaw: string = (addr?.state || '').toString();
  const stateClean = stateRaw.replace(/\s*Province\s*$/i, '').trim();
  const provinceMatch =
    Object.keys(ZAMBIA_DATA).find((p) => p.toLowerCase() === stateClean.toLowerCase()) ?? null;

  // City: try every locality field Nominatim might fill, in priority order.
  let cityMatch: string | null = null;
  let rawLocality = '';
  if (provinceMatch) {
    const candidates: string[] = [
      addr?.city,
      addr?.town,
      addr?.village,
      addr?.municipality,
      addr?.suburb,
      (addr?.county || '').replace(/\s*District\s*$/i, '').trim(),
    ].filter(Boolean);
    rawLocality = candidates[0] || '';
    for (const candidate of candidates) {
      const m = ZAMBIA_DATA[provinceMatch].find(
        (c) => c.toLowerCase() === candidate.toLowerCase()
      );
      if (m) {
        cityMatch = m;
        break;
      }
    }
  }
  return { province: provinceMatch, city: cityMatch, rawLocality, rawState: stateClean };
}

interface ResolvedLocation {
  province: string | null;
  city: string | null;
  address: string;
  rawLocality: string;
  rawState: string;
}

/**
 * Reverse-geocode (lat, lng) to a Zambian province + city + best-effort
 * street address using OpenStreetMap's Nominatim service. Best-effort —
 * returns null if the request fails or the result isn't in Zambia.
 *
 * The province/city we return are pinned to the values in ZAMBIA_DATA so
 * the existing select dropdowns can match them exactly. If Nominatim
 * returns a city we don't know (e.g. a small village), we leave city null
 * and let the user complete it manually.
 */
async function reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.address || data.address.country_code !== 'zm') return null;

    const addr = data.address;
    const { province: provinceMatch, city: cityMatch, rawLocality, rawState } =
      matchZambiaAddress(addr);

    const address = [addr.road, addr.suburb || addr.neighbourhood]
      .filter(Boolean)
      .join(', ');

    return {
      province: provinceMatch,
      city: cityMatch,
      address,
      rawLocality,
      rawState,
    };
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return null;
  }
}

export interface GeocodeSuggestion {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  province: string | null;
  city: string | null;
}

/**
 * Forward-geocode a free-text query ("Airport", "Manda Hill", …) to a
 * short list of Zambian place candidates via Nominatim's /search endpoint.
 * This is what makes the Area/Landmark field the PRIMARY way to set the
 * map pin: the buyer describes WHERE they want the product/service found,
 * and picking a result pins THAT place — not the device's GPS.
 *
 * Callers must pass an AbortController signal and treat AbortError as
 * "no results yet" so a fast typist's stale requests never clobber a
 * later, more specific query.
 */
async function forwardGeocode(query: string, signal?: AbortSignal): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=zm&accept-language=en&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((r: any) => r?.address?.country_code === 'zm')
      .map((r: any): GeocodeSuggestion => {
        const { province, city } = matchZambiaAddress(r.address);
        const displayName: string = r.display_name || '';
        const name: string = r.name || displayName.split(',')[0]?.trim() || trimmed;
        return {
          id: String(r.place_id ?? `${r.lat},${r.lon}`),
          name,
          displayName,
          lat: Number(r.lat),
          lon: Number(r.lon),
          province,
          city,
        };
      })
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon));
  } catch (err) {
    if ((err as any)?.name === 'AbortError') return [];
    console.warn('Forward geocode failed:', err);
    return [];
  }
}

export default function LocationDetails({
  onBack,
  onComplete,
  submitLabel = 'Next →',
  showRadius = true,
  showGps = true,
  isStandalone = true,
  embeddedInShell = false,
  initialValue,
}: LocationDetailsProps) {
  const [country, setCountry] = useState('Zambia');
  const [province, setProvince] = useState(initialValue?.province ?? '');
  const [city, setCity] = useState(initialValue?.city ?? '');
  const [address, setAddress] = useState(initialValue?.address ?? '');
  const [latitude, setLatitude] = useState<number | undefined>(initialValue?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialValue?.longitude);
  // Accuracy radius reported by the browser, in metres. Smaller is better;
  // GPS-chip readings on a phone are typically <30m, Wi-Fi triangulation
  // on a desktop is often hundreds-to-thousands of metres. We surface this
  // so the user can decide whether to trust the pin or refine manually.
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>();
  const [radius, setRadius] = useState<number>(initialValue?.radius ?? 5); // Default 5km
  const [isLocating, setIsLocating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resolvedNote, setResolvedNote] = useState<string | null>(null);

  // Area/Landmark search-as-you-type — the PRIMARY way to set the map pin:
  // this screen is about WHERE the buyer wants the product/service found,
  // not where their device is. Device GPS (Section 02) stays available as
  // a secondary/override option.
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // Avoids a "No matches" flash during the debounce wait — only true once
  // a search for the CURRENT text has actually returned.
  const [hasSearched, setHasSearched] = useState(false);
  // Which source produced the current pin — drives "GPS Pinned" vs
  // "Location Pinned" wording and the GPS button label.
  const [pinSource, setPinSource] = useState<'gps' | 'search' | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchReqIdRef = useRef(0);

  // GPS coordinates are an OPTIONAL refinement on top of province + city.
  // The form always exposes the GPS toggle so the user can choose to pin
  // a precise point — useful even on desktops where the underlying API
  // gives coarser readings, since the user might know their exact lat/lng
  // (e.g. from Google Maps) and just wants to try once. The accuracy
  // tier badges below ("This device has no GPS chip…") tell them when
  // the reading isn't precise enough to trust.

  const provinces = Object.keys(ZAMBIA_DATA).sort();
  const cities = province ? ZAMBIA_DATA[province].sort() : [];

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvince(e.target.value);
    setCity(''); // Reset city when province changes
  };

  const runAddressSearch = async (q: string) => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const reqId = ++searchReqIdRef.current;
    setIsSearching(true);
    const results = await forwardGeocode(q, controller.signal);
    if (reqId !== searchReqIdRef.current) return; // superseded by a later keystroke
    setIsSearching(false);
    setHasSearched(true);
    setSuggestions(results);
  };

  // Debounce lives in the change handler, NOT a useEffect on `address` —
  // GPS capture and suggestion-pick both call setAddress directly and must
  // never re-trigger a search of their own output.
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setShowSuggestions(true);

    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    const trimmed = value.trim();
    setHasSearched(false); // new cycle — no stale "No matches" while we wait
    if (trimmed.length < 3) {
      searchAbortRef.current?.abort();
      searchReqIdRef.current += 1; // invalidate any in-flight response
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(() => runAddressSearch(trimmed), 400);
  };

  const handlePickSuggestion = (s: GeocodeSuggestion) => {
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    searchAbortRef.current?.abort();

    setAddress(s.name);
    setLatitude(s.lat);
    setLongitude(s.lon);
    // A place pin from search isn't a GPS fix — clear stale accuracy so
    // the accuracy chip / "no GPS chip" warning don't render for it.
    setAccuracyMeters(undefined);
    setGeoError(null);
    setPinSource('search');
    if (s.province) setProvince(s.province);
    if (s.city) setCity(s.city);
    setResolvedNote(
      s.province && s.city
        ? `Pinned: ${s.name}, ${s.city}`
        : s.province
          ? `Pinned: ${s.name}, ${s.province} Province — confirm city manually`
          : `Pinned: ${s.name} — confirm province & city manually`
    );

    setSuggestions([]);
    setHasSearched(false);
    setShowSuggestions(false);
  };

  /**
   * Capture the user's location at the highest accuracy the device will
   * give us. Onboarding pins the user's home/work coordinates, so the
   * pin needs to land on the actual user — getCurrentPosition often
   * returns a coarse first-fix (Wi-Fi triangulation), which can be
   * kilometres off. We use watchPosition to keep collecting readings as
   * the GPS chip refines its lock and pick the smallest-accuracy one.
   *
   * Stop conditions (whichever fires first):
   *  - a reading lands with accuracy <= 25m (GPS-grade, accept and stop)
   *  - 12 seconds elapse (commit to the best reading we've seen)
   *  - the API errors before any reading lands (treat as failure)
   */
  const handleUseMyLocation = () => {
    // Snapshot the previous reading before we wipe state. If the scan
    // fails, we restore it so the user doesn't lose progress to a flaky
    // re-scan — a stale-but-valid pin is more useful than no pin.
    const prevReading =
      latitude !== undefined && longitude !== undefined
        ? { lat: latitude, lng: longitude, accuracy: accuracyMeters }
        : null;

    setIsLocating(true);
    setGeoError(null);
    setResolvedNote(null);
    setAccuracyMeters(undefined);
    setLatitude(undefined);
    setLongitude(undefined);
    setPinSource(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    // If the scan failed and we had a prior reading, put it back so the UI
    // doesn't lose progress. Returns true if we restored.
    const restorePrev = (): boolean => {
      if (!prevReading) return false;
      setLatitude(prevReading.lat);
      setLongitude(prevReading.lng);
      setAccuracyMeters(prevReading.accuracy);
      return true;
    };

    const commit = async (position: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      cleanup();

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      if (!isInZambia(lat, lng)) {
        setGeoError(
          'ProQuote is currently available only in Zambia. Switch to Manual to enter a Zambian address.'
        );
        setIsLocating(false);
        return;
      }

      setLatitude(lat);
      setLongitude(lng);
      setAccuracyMeters(accuracy);
      setIsLocating(false);
      setPinSource('gps');

      // Reverse-geocode and auto-fill the manual fields. The actual select
      // values stay populated even if the user switches back to Manual mode,
      // so they can refine without losing GPS-detected context.
      setIsResolving(true);
      const resolved = await reverseGeocode(lat, lng);
      setIsResolving(false);

      if (!resolved) {
        setResolvedNote(
          'Coordinates captured — please confirm province and city manually.'
        );
        return;
      }
      if (resolved.province) setProvince(resolved.province);
      if (resolved.city) setCity(resolved.city);
      if (resolved.address) setAddress(resolved.address);

      if (resolved.province && resolved.city) {
        setResolvedNote(`${resolved.city}, ${resolved.province} Province`);
      } else if (resolved.province) {
        setResolvedNote(
          `${resolved.province} Province · refine city manually${
            resolved.rawLocality ? ` (detected: ${resolved.rawLocality})` : ''
          }`
        );
      } else {
        setResolvedNote(
          `Detected: ${resolved.rawState || 'Zambia'} — please confirm in Manual.`
        );
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const acc = position.coords.accuracy;
        if (!bestPosition || acc < bestPosition.coords.accuracy) {
          bestPosition = position;
          // Surface the live best accuracy so the user sees the pin sharpen.
          setAccuracyMeters(acc);
        }
        // Good enough — accept immediately so we don't make the user wait.
        if (acc <= 25) {
          commit(position);
        }
      },
      (error) => {
        // If we already have a reading from this scan, ignore late errors —
        // the timer will commit the best one. Only escalate when we truly
        // have nothing from this attempt.
        if (bestPosition) return;
        if (settled) return;
        settled = true;
        cleanup();
        const restored = restorePrev();
        const msg =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Allow GPS in your browser settings, or switch to Manual.'
            : error.code === error.TIMEOUT
              ? restored
                ? "Couldn't refine — keeping the previous reading. Try again or switch to Manual for a precise address."
                : 'GPS timed out. Try again, or switch to Manual.'
              : restored
                ? "Couldn't refine — keeping the previous reading."
                : 'Unable to retrieve your location. Switch to Manual to enter it yourself.';
        setGeoError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    // Hard ceiling on the watch window. Whatever's best after this elapses
    // is what we commit. If nothing came in, fall back to the prior reading
    // (if any) rather than wiping the user's pin on a flaky re-scan.
    window.setTimeout(() => {
      if (settled) return;
      if (bestPosition) {
        commit(bestPosition);
      } else {
        settled = true;
        cleanup();
        const restored = restorePrev();
        setGeoError(
          restored
            ? "Couldn't refine — keeping the previous reading. Try again or switch to Manual for a precise address."
            : 'GPS timed out — try again, or switch to Manual.'
        );
        setIsLocating(false);
      }
    }, 12000);
  };

  const handleComplete = () => {
    // Province + city are the only requirements — the city is the inquiry's
    // destination scope. Coordinates are an optional refinement: when set,
    // the backend can match providers within `radius` km of the point;
    // when blank, matching falls back to "all providers in this city".
    if (!province || !city) return;
    // With GPS off (buyer registration) we save no coordinates — even if the
    // Area/Landmark search happened to set an internal lat/lng, strip it here.
    const hasCoords = showGps && latitude !== undefined && longitude !== undefined;
    onComplete({
      province,
      city,
      address,
      latitude: showGps ? latitude : undefined,
      longitude: showGps ? longitude : undefined,
      radius: hasCoords && showRadius ? radius : undefined,
    });
  };

  // Field shell — used for selects (any field where we need a label
  // always-floating gold + same chrome as FloatingInput).
  const fieldShell =
    'block w-full pl-[52px] pr-12 h-[58px] bg-brand-white border border-[#e8e0d0] rounded-2xl text-[15px] text-brand-dark shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)] outline-none transition-all duration-200 font-medium appearance-none';
  const floatingLabel =
    'absolute top-0 left-[16px] -translate-y-1/2 px-1.5 bg-brand-white text-[12px] font-bold uppercase tracking-[0.08em] text-[#C9973A] pointer-events-none';

  const hasCoords = latitude !== undefined && longitude !== undefined;
  // Two intents — drives the entire form's framing:
  //   inquiry      (showRadius=true)  — "Where is this inquiry going + how far?"
  //   registration (showRadius=false) — "Where is your shop, exactly?"
  // The radius block, the "be at your shop" advisory, and the
  // section labels all branch on this single signal.
  const isRegistration = !showRadius;

  const formContent = (
    <div className="flex flex-col gap-7">
      {/* Section 01 — Service Area */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] shrink-0">
          {isRegistration
            ? showGps
              ? 'Section 01 · Your Shop'
              : 'Section 01 · Your Area'
            : 'Section 01 · Where'}
        </p>
        <div className="h-px flex-1 bg-[#e8e4dc]" />
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] font-bold uppercase tracking-[0.14em] text-[10px] shrink-0">
          <Globe className="w-3 h-3" />
          {country}
        </span>
      </div>

      {/* Registration-only "Be at your shop" advisory — sets expectations
          before they capture coordinates. The captured pin becomes the
          permanent map location buyers use to find this business, so
          it has to come from the actual shop, not from home or in
          transit. Inquiry context doesn't get this banner because the
          stakes are different — inquiries are temporary, a shop pin
          is forever-ish.
          When `embeddedInShell` is true, RegistrationStepShell renders
          the advisory (and the per-step context) in its own slot, so
          we skip the inline copy here to avoid showing it twice. */}
      {isRegistration && !embeddedInShell && showGps && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#C9973A]/30 bg-gradient-to-br from-[#fdf6e9]/80 to-[#fdf6e9]/30">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#C9973A]/30">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-1">
              Important · Be at your shop
            </p>
            <p className="text-[13px] text-[#1a1612] font-medium leading-snug">
              The coordinates you capture become the <span className="font-bold">permanent map pin</span> buyers use to find this business. Capture them from inside your shop — not from home, not on the move.
            </p>
          </div>
        </div>
      )}

      {/* Province + City — stack on mobile, side-by-side from sm up so
          the native selects aren't squeezed to "Sele…" on small screens. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative w-full">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
              <Map className="h-5 w-5 text-[#C9973A]/55" strokeWidth={2} />
            </div>
            <select
              value={province}
              onChange={handleProvinceChange}
              className={fieldShell}
            >
              <option value="">Select…</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a1612]/40 pointer-events-none z-20" />
            <label className={floatingLabel}>Province</label>
          </div>
        </div>

        <div className="relative w-full">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
              <Building2
                className={`h-5 w-5 ${
                  !province ? 'text-[#C9973A]/30' : 'text-[#C9973A]/55'
                }`}
                strokeWidth={2}
              />
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!province}
              className={`${fieldShell} disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <option value="">{province ? 'Select…' : '—'}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a1612]/40 pointer-events-none z-20" />
            <label className={floatingLabel}>City</label>
          </div>
        </div>
      </div>

      {/* Area / Landmark — the PRIMARY driver of the pin. This screen is
          about WHERE the buyer wants the product/service found, so as
          they type we search OpenStreetMap for matching Zambian places;
          picking a suggestion pins THAT place's coordinates and
          auto-fills province/city. Device GPS (Section 02 below) is a
          secondary way to set the pin instead. */}
      <div className="relative w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
            <MapPin className="h-5 w-5 text-[#C9973A]/55" strokeWidth={2} />
          </div>
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            onFocus={() => {
              if (suggestions.length > 0 || hasSearched) setShowSuggestions(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            autoComplete="off"
            placeholder="e.g. Airport, Manda Hill, a market or landmark…"
            className="block w-full pl-[52px] pr-12 h-[58px] bg-brand-white border border-[#e8e0d0] rounded-2xl text-[15px] text-brand-dark shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)] outline-none transition-all duration-200 font-medium placeholder:text-[#1a1612]/30"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-20">
              <Loader2 className="w-4 h-4 text-[#C9973A] animate-spin" />
            </div>
          )}
          <label className={floatingLabel}>Area / Landmark</label>

          {showSuggestions &&
            (suggestions.length > 0 ||
              (hasSearched && !isSearching && suggestions.length === 0)) && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
                {suggestions.length > 0 ? (
                  suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePickSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#faf6ee] transition-colors border-b border-slate-50 last:border-b-0 cursor-pointer"
                    >
                      <p className="text-[13px] font-bold text-[#1a1612] truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{s.displayName}</p>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-[12px] text-[#1a1612]/45">
                    No matches — try a different spelling, or keep typing.
                  </p>
                )}
              </div>
            )}
        </div>
        <p className="text-[11px] text-[#1a1612]/50 mt-1.5 ml-1 leading-snug">
          {showGps
            ? 'The most important field — search the area, market or landmark where you need this, then pick a result to set the map pin.'
            : 'Search the area, market or landmark near you, then pick a result to fill in your province and city.'}
        </p>
      </div>

      {showGps && (
        <>
      {/* Section 02 — Pin location. Inline GPS picker on the same
          screen as the manual fields. When `showRadius` is true
          (inquiry context) we frame this as an optional refinement
          on top of city-level matching; when false (registration
          context) we frame it as the primary "exactly where are
          you?" action and style it more prominently. The radius
          slider only renders when showRadius is true. */}
      <div className="flex items-center gap-3 pt-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] shrink-0">
          Section 02 · {showRadius ? 'Pin & Reach' : 'Pinpoint'}
        </p>
        <div className="h-px flex-1 bg-[#e8e4dc]" />
        <span className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50 shrink-0">
          {showRadius ? 'Optional · Sharper match' : 'Recommended · Be findable'}
        </span>
      </div>

      {/* GPS pin row — compact, always visible. Click to capture.
          In registration mode (showRadius=false) the row is taller
          and the CTA gets the primary gold gradient — capturing the
          exact pin is the main job, not a refinement. */}
      <div
        className={`rounded-2xl border bg-brand-white ${
          !showRadius && !hasCoords
            ? 'border-[#C9973A]/30 shadow-[0_0_0_4px_rgba(201,151,58,0.06)] p-6'
            : 'border-[#e8e0d0] p-5'
        }`}
      >
        <div className="flex flex-wrap items-start gap-4">
          <div
            className={`relative w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${
              hasCoords
                ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white shadow-md shadow-[#C9973A]/30'
                : 'bg-[#f1ede5] text-[#C9973A]/55'
            }`}
          >
            {isLocating && (
              <>
                <div className="absolute inset-0 border-2 border-[#C9973A]/30 rounded-2xl animate-ping" />
                <div className="absolute inset-1 border border-[#C9973A]/50 rounded-xl animate-pulse" />
              </>
            )}
            <Navigation className="w-6 h-6 relative" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                {isLocating
                  ? 'Locking GPS…'
                  : isResolving
                    ? 'Resolving…'
                    : geoError
                      ? 'GPS Issue'
                      : hasCoords
                        ? pinSource === 'gps'
                          ? 'GPS Pinned'
                          : 'Location Pinned'
                        : showRadius
                          ? 'Pinpoint the location'
                          : 'Where exactly are you?'}
              </p>
              {!isLocating && accuracyMeters !== undefined && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.14em] tabular-nums ${
                    accuracyMeters <= 30
                      ? 'text-emerald-600'
                      : accuracyMeters <= 150
                        ? 'text-[#C9973A]'
                        : 'text-rose-500'
                  }`}
                >
                  ± {accuracyMeters < 1000
                    ? `${Math.round(accuracyMeters)}m`
                    : `${(accuracyMeters / 1000).toFixed(1)}km`}
                </span>
              )}
            </div>

            {hasCoords ? (
              <p className="text-[14px] font-mono font-bold text-[#1a1612]/80 tabular-nums tracking-tight">
                {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
              </p>
            ) : showRadius ? (
              <p className="text-[12px] text-[#1a1612]/55 leading-snug">
                Optional — sharpens delivery pricing. The radius below works without it.
              </p>
            ) : (
              <p className="text-[12px] text-[#1a1612]/65 leading-snug">
                GPS pins your <span className="font-bold text-[#1a1612]">exact spot</span> — sharper than city alone.
              </p>
            )}

            {!isLocating && resolvedNote && hasCoords && (
              <p className="text-[11px] text-emerald-700 mt-1 leading-snug">
                <Check className="w-3 h-3 inline mr-1" strokeWidth={3} />
                {/* Search notes are already phrased "Pinned: …" — only GPS
                    fills keep the historical "Auto-filled:" prefix. */}
                {pinSource === 'gps' ? `Auto-filled: ${resolvedNote}` : resolvedNote}
              </p>
            )}

            {geoError && (
              <p className="text-[11px] text-rose-500/85 mt-1 leading-snug">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {geoError}
              </p>
            )}

            {!isLocating &&
              !geoError &&
              accuracyMeters !== undefined &&
              accuracyMeters > 500 && (
                <p className="text-[11px] text-rose-500/85 mt-1 leading-snug">
                  This device has no GPS chip — reading is triangulated from Wi-Fi/IP and isn't precise enough to match nearby providers.
                </p>
              )}
          </div>

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className={`w-full sm:w-auto sm:self-center shrink-0 px-5 h-11 rounded-xl text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
              !showRadius && !hasCoords
                ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white shadow-[0_4px_12px_-4px_rgba(201,151,58,0.5)] hover:from-[#C9973A] hover:to-[#B08432]'
                : 'bg-[#faf6ee] border border-[#e8e0d0] text-[#1a1612]/75 hover:bg-[#f1ede5]'
            }`}
          >
            <Navigation
              className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''} ${
                !showRadius && !hasCoords ? 'text-white' : 'text-[#C9973A]'
              }`}
            />
            {isLocating
              ? 'Scanning'
              : hasCoords
                ? pinSource === 'gps'
                  ? 'Re-scan'
                  : 'Use GPS Instead'
                : 'Capture My GPS'}
          </button>
        </div>
      </div>
        </>
      )}

      {/* Radius / outreach slider — always visible. Tells the buyer
          "how far should this inquiry reach?" in plain language. */}
      {showRadius && (
        <div className="rounded-2xl border border-[#f1ede5] bg-[#faf6ee] p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-1">
                Outreach Radius
              </p>
              <h4 className="text-[14px] font-bold text-[#1a1612] font-sans leading-tight">
                How far should this inquiry reach?
              </h4>
              <p className="text-[11px] text-[#1a1612]/55 mt-1 leading-snug">
                {hasCoords
                  ? 'Providers within this radius of your pin will see the inquiry.'
                  : 'Providers within this radius of your selected city centre will see the inquiry.'}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <span className="text-[36px] font-bold text-[#C9973A] tabular-nums font-serif leading-none">
                {radius}
              </span>
              <span className="text-[12px] font-bold text-[#1a1612]/45 ml-1 uppercase tracking-wider">
                km
              </span>
            </div>
          </div>

          <div className="relative h-9 flex items-center px-1">
            <div className="absolute left-0 right-0 h-1.5 bg-[#e8e0d0] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C9973A] to-[#D5A547] transition-all duration-300"
                style={{ width: `${radius}%` }}
              />
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Outreach radius in kilometres"
            />
            <div
              className="absolute w-6 h-6 bg-white border-[3px] border-[#C9973A] rounded-full shadow-md pointer-events-none transition-all duration-300"
              style={{ left: `calc(${radius}% - 12px)` }}
            />
          </div>

          <div className="flex justify-between mt-2 px-1">
            {[1, 25, 50, 75, 100].map((val) => (
              <span
                key={val}
                className={`text-[9px] font-bold tabular-nums transition-colors ${
                  Math.abs(radius - val) <= 5
                    ? 'text-[#C9973A]'
                    : 'text-[#1a1612]/35'
                }`}
              >
                {val}km
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 03 — Privacy */}
      <div className="flex items-center gap-3 pt-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] shrink-0">
          Section 0{showGps ? '3' : '2'} · Privacy
        </p>
        <div className="h-px flex-1 bg-[#e8e4dc]" />
      </div>

      <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#e8e4dc] bg-brand-white">
        <div className="w-9 h-9 rounded-lg bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-[#1a1612] leading-tight">
            Your address stays private
          </p>
          <p className="text-[11px] text-[#1a1612]/55 mt-0.5 leading-snug">
            Only your province and city are shown publicly — full address is shared with a provider only after you accept a quote.
          </p>
        </div>
      </div>

      {/* Submit — province + city are the only requirements. Coordinates
          are optional refinement: when present they sharpen matching,
          when absent the inquiry broadcasts to every provider in the
          chosen city. */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={!province || !city}
        className="group w-full h-[58px] mt-2 shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] disabled:from-[#e8e4dc] disabled:to-[#e0dccf] disabled:text-[#1a1612]/30 disabled:cursor-not-allowed transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
      >
        {submitLabel}
      </button>
    </div>
  );

  // Embedded usage — caller owns the layout shell
  if (!isStandalone) {
    return formContent;
  }

  // Standalone — full 2-column page with left explainer panel
  return (
    <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full min-h-screen bg-[#f5f2ed]">
      {/* Mobile-only sticky header */}
      <div className="md:hidden sticky top-0 z-30 px-4 pt-4 pb-5 bg-[#f5f2ed]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
            </button>
          )}
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
            STEP 3 / LOCATION
          </p>
        </div>
        <div className="mt-2">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
            Location
          </h1>
        </div>
      </div>

      <div className="p-4 md:p-8 lg:p-10 xl:p-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
          {/* Desktop left-side context — sticky */}
          <div className="hidden md:flex flex-col gap-8 w-full md:w-[320px] lg:w-[400px] shrink-0 sticky top-12">
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-[32px] p-8 shadow-sm">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider mb-8 hover:gap-3 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to preferences
                </button>
              )}

              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#C9973A]/10 rounded-2xl flex items-center justify-center text-[#C9973A]">
                  <MapPin className="w-8 h-8" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A]">
                  Step 03 / Where
                </p>
                <h1 className="font-serif text-[32px] font-bold text-[#1a1a2e] leading-[1.1]">
                  Location
                </h1>
                <p className="text-[14px] text-[#1a1a2e]/60 leading-relaxed font-medium">
                  Tell us where you are so we can match you with the right local providers and price delivery accurately.
                </p>
              </div>
            </div>

            {/* Why location matters */}
            <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#C9973A]/15 rounded-[32px] p-7">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-1">
                    ProQuote Tip
                  </p>
                  <h3 className="font-serif text-[18px] font-bold text-[#1a1a2e] leading-snug">
                    Why location matters
                  </h3>
                </div>
              </div>
              <p className="text-[13px] text-[#1a1a2e]/65 leading-relaxed font-medium mb-5">
                We use your location to surface nearby providers, price delivery accurately, and keep your inquiry relevant to your area.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Local shops</span> see your inquiry first — closer offers, faster turnaround.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Truck className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Delivery pricing</span> stays accurate when providers know exactly where to ship.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Navigation className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">GPS</span> gives the sharpest match — capture it for the most precise quotes.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Your address</span> stays private until you accept a quote.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Right-side form */}
          <div className="flex-1 w-full">
            <div className="bg-white border border-[#f1f5f9] rounded-[32px] p-6 md:p-8 xl:p-10 shadow-sm shadow-[#1a1a2e]/[0.02]">
              {formContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
