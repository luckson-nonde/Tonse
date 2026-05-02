import React, { useState } from 'react';
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

    // Province: Nominatim returns "Lusaka Province" — strip the suffix.
    const stateRaw: string = (addr.state || '').toString();
    const stateClean = stateRaw.replace(/\s*Province\s*$/i, '').trim();
    const provinceMatch =
      Object.keys(ZAMBIA_DATA).find((p) => p.toLowerCase() === stateClean.toLowerCase()) ?? null;

    // City: try every locality field Nominatim might fill, in priority order.
    let cityMatch: string | null = null;
    let rawLocality = '';
    if (provinceMatch) {
      const candidates: string[] = [
        addr.city,
        addr.town,
        addr.village,
        addr.municipality,
        addr.suburb,
        (addr.county || '').replace(/\s*District\s*$/i, '').trim(),
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

    const address = [addr.road, addr.suburb || addr.neighbourhood]
      .filter(Boolean)
      .join(', ');

    return {
      province: provinceMatch,
      city: cityMatch,
      address,
      rawLocality,
      rawState: stateClean,
    };
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return null;
  }
}

export default function LocationDetails({
  onBack,
  onComplete,
  submitLabel = 'Next →',
  showRadius = true,
  isStandalone = true,
}: LocationDetailsProps) {
  const [country, setCountry] = useState('Zambia');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [radius, setRadius] = useState<number>(5); // Default 5km
  const [isLocating, setIsLocating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [useGps, setUseGps] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resolvedNote, setResolvedNote] = useState<string | null>(null);

  const provinces = Object.keys(ZAMBIA_DATA).sort();
  const cities = province ? ZAMBIA_DATA[province].sort() : [];

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvince(e.target.value);
    setCity(''); // Reset city when province changes
  };

  const handleUseMyLocation = () => {
    setIsLocating(true);
    setGeoError(null);
    setResolvedNote(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (!isInZambia(lat, lng)) {
          setGeoError(
            'Tonse is currently available only in Zambia. Switch to Manual to enter a Zambian address.'
          );
          setIsLocating(false);
          return;
        }

        setLatitude(lat);
        setLongitude(lng);
        setUseGps(true);
        setIsLocating(false);

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
      },
      (error) => {
        console.error('Geolocation error:', error);
        const msg =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Allow GPS in your browser settings, or switch to Manual.'
            : error.code === error.TIMEOUT
              ? 'GPS timed out. Try again, or switch to Manual.'
              : 'Unable to retrieve your location. Switch to Manual to enter it yourself.';
        setGeoError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleComplete = () => {
    // If user is in manual mode, clicking complete should first take them to GPS to verify
    if (!useGps) {
      handleUseMyLocation();
      return;
    }

    onComplete({
      province,
      city,
      address,
      latitude,
      longitude,
      radius: useGps && showRadius ? radius : undefined,
    });
  };

  // Field shell — used for selects (any field where we need a label
  // always-floating gold + same chrome as FloatingInput).
  const fieldShell =
    'block w-full pl-[52px] pr-12 h-[58px] bg-brand-white border border-[#e8e0d0] rounded-2xl text-[15px] text-brand-dark shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)] outline-none transition-all duration-200 font-medium appearance-none';
  const floatingLabel =
    'absolute top-0 left-[16px] -translate-y-1/2 px-1.5 bg-brand-white text-[12px] font-bold uppercase tracking-[0.08em] text-[#C9973A] pointer-events-none';

  const formContent = (
    <div className="flex flex-col gap-6">
      {/* Section 01 — Service Area */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] shrink-0">
          Section 01
        </p>
        <div className="h-px flex-1 bg-[#e8e4dc]" />
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] font-bold uppercase tracking-[0.14em] text-[10px] shrink-0">
          <Globe className="w-3 h-3" />
          {country}
        </span>
      </div>

      {/* Mode Selector — compact segmented control */}
      <div className="flex p-[3px] bg-[#f1ede5] rounded-full">
        <button
          type="button"
          onClick={() => setUseGps(false)}
          className={`flex-1 h-9 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2 ${
            !useGps
              ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white shadow-[0_4px_12px_-6px_rgba(201,151,58,0.5)]'
              : 'text-[#1a1612]/45 hover:text-[#1a1612]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Manual
        </button>
        <button
          type="button"
          onClick={() => {
            if (!latitude) handleUseMyLocation();
            else setUseGps(true);
          }}
          className={`flex-1 h-9 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2 ${
            useGps
              ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white shadow-[0_4px_12px_-6px_rgba(201,151,58,0.5)]'
              : 'text-[#1a1612]/45 hover:text-[#1a1612]'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          GPS
        </button>
      </div>

      <div className="relative">
        {useGps ? (
          <div className="rounded-2xl border border-[#e8e0d0] bg-brand-white p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* GPS Visualizer */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-[#C9973A]/20 rounded-full animate-ping" />
                <div className="absolute inset-3 border-2 border-[#C9973A]/40 rounded-full animate-pulse" />
                <div className="absolute inset-6 border-2 border-[#C9973A]/60 rounded-full" />
                <div className="relative w-14 h-14 bg-gradient-to-b from-[#D5A547] to-[#C9973A] rounded-full flex items-center justify-center shadow-lg shadow-[#C9973A]/30">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-0.5">
                  {isResolving ? 'Resolving location…' : geoError ? 'GPS Issue' : 'GPS Active'}
                </p>
                {latitude !== undefined && longitude !== undefined && (
                  <p className="text-[12px] font-mono text-[#1a1612]/55 tabular-nums">
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </p>
                )}
              </div>
            </div>

            {/* Inline status — auto-fill confirmation OR error */}
            {geoError ? (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50/60">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-rose-600 leading-tight">
                    Couldn't use GPS
                  </p>
                  <p className="text-[11px] text-rose-500/80 mt-0.5 leading-snug">{geoError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseGps(false)}
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 hover:underline shrink-0 self-center"
                >
                  Manual
                </button>
              </div>
            ) : (
              resolvedNote && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 mb-0.5">
                      Auto-filled
                    </p>
                    <p className="text-[12px] font-bold text-[#1a1612] leading-tight">
                      {resolvedNote}
                    </p>
                    {address && (
                      <p className="text-[11px] text-[#1a1612]/55 mt-0.5 leading-snug truncate">
                        {address}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseGps(false)}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] hover:underline shrink-0 self-center"
                  >
                    Edit
                  </button>
                </div>
              )
            )}

            {/* Radius Control */}
            {showRadius && (
              <div className="bg-[#faf6ee] rounded-2xl p-5 border border-[#f1ede5]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-0.5">
                      Search Radius
                    </p>
                    <h4 className="text-[13px] font-bold text-[#1a1612] font-sans">
                      Coverage Area
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[28px] font-bold text-[#C9973A] tabular-nums font-serif">
                      {radius}
                    </span>
                    <span className="text-[11px] font-bold text-[#1a1612]/45 ml-1 uppercase">
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
                      className="text-[9px] font-bold text-[#1a1612]/35"
                    >
                      {val}km
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="w-full h-11 bg-[#faf6ee] border border-[#e8e0d0] rounded-xl text-[10px] font-bold text-[#1a1612]/70 uppercase tracking-[0.18em] hover:bg-[#f1ede5] transition-all flex items-center justify-center gap-2"
            >
              <Navigation
                className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''} text-[#C9973A]`}
              />
              {isLocating ? 'Scanning…' : 'Re-scan location'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-2 gap-4">
              {/* Province */}
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

              {/* City */}
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

            {/* Address */}
            <div className="relative w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                  <MapPin className="h-5 w-5 text-[#C9973A]/55" strokeWidth={2} />
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, building, landmark"
                  className="block w-full pl-[52px] pr-4 h-[58px] bg-brand-white border border-[#e8e0d0] rounded-2xl text-[15px] text-brand-dark shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)] outline-none transition-all duration-200 font-medium placeholder:text-[#1a1612]/30"
                />
                <label className={floatingLabel}>Address (Optional)</label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 02 — Privacy */}
      <div className="flex items-center gap-3 pt-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] shrink-0">
          Section 02
        </p>
        <div className="h-px flex-1 bg-[#e8e4dc]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50 shrink-0">
          Privacy
        </p>
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

      {/* Submit */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={!useGps && (!province || !city)}
        className="group w-full h-[58px] mt-2 shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] disabled:from-[#e8e4dc] disabled:to-[#e0dccf] disabled:text-[#1a1612]/30 disabled:cursor-not-allowed transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
      >
        {!useGps ? (
          <>
            Next · Capture GPS Location <span className="text-base leading-none">→</span>
          </>
        ) : (
          submitLabel
        )}
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
                    Tonse Tip
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
