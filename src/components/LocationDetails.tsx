import React, { useState } from 'react';
import { MapPin, ChevronDown, Globe, Map, Building2, Navigation, ChevronLeft } from 'lucide-react';

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
  const [useGps, setUseGps] = useState(false);

  const provinces = Object.keys(ZAMBIA_DATA).sort();
  const cities = province ? ZAMBIA_DATA[province].sort() : [];

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvince(e.target.value);
    setCity(''); // Reset city when province changes
  };

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setUseGps(true);
        setIsLocating(false);
        // Optionally try to reverse geocode or just set a placeholder
        setProvince('Lusaka'); // Defaulting for now if GPS is used
        setCity('Current Location');
      },
      (error) => {
        console.error('Error obtaining location:', error);
        alert(
          "Unable to retrieve your location. Please ensure GPS is enabled and you've granted permission."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleComplete = () => {
    onComplete({
      province,
      city,
      address,
      latitude,
      longitude,
      radius: useGps && showRadius ? radius : undefined,
    });
  };

  const labelClasses =
    'block text-[10px] font-bold text-[#94a3b8] tracking-[0.1em] uppercase mb-2 ml-1 font-sans';

  return (
    <div
      className={isStandalone ? 'max-w-4xl mx-auto w-full' : 'w-full'}
    >
      {/* Sticky Header */}
      {isStandalone && (
        <div className="sticky top-0 bg-[#f5f2ed]/80 backdrop-blur-md z-20 px-4 pt-4 pb-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
              </button>
            )}
            <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
              STEP 3
            </p>
          </div>

          <div className="mt-2">
            <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
              Location
            </h1>
          </div>
        </div>
      )}

      <div
        className={
          isStandalone ? 'p-[20px_16px_140px_16px] flex flex-col gap-6' : 'flex flex-col gap-6'
        }
      >
        {/* Mode Selector */}
        <div className="flex p-1 bg-[#e2e8f0] rounded-full shadow-sm">
          <button
            onClick={() => setUseGps(false)}
            className={`flex-1 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
              !useGps ? 'bg-[#C9973A] text-white shadow-sm' : 'text-[#94a3b8] hover:text-[#1a1a2e]'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => {
              if (!latitude) handleUseMyLocation();
              else setUseGps(true);
            }}
            className={`flex-1 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              useGps ? 'bg-[#C9973A] text-white shadow-sm' : 'text-[#94a3b8] hover:text-[#1a1a2e]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            GPS
          </button>
        </div>

        <div className="relative">
          {useGps ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#f1f5f9] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* GPS Visualizer */}
              <div className="flex flex-col items-center justify-center py-6 relative">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-[#C9973A]/20 rounded-full animate-ping" />
                  <div className="absolute inset-4 border-2 border-[#C9973A]/40 rounded-full animate-pulse" />
                  <div className="absolute inset-8 border-2 border-[#C9973A]/60 rounded-full" />

                  <div className="relative w-20 h-20 bg-[#C9973A] rounded-full flex items-center justify-center shadow-lg shadow-[rgba(201,151,58,0.3)]">
                    <Navigation className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <h3 className="text-[18px] font-bold text-[#1a1a2e] tracking-tight font-sans">
                    GPS Active
                  </h3>
                  <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mt-1 font-sans">
                    {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Radius Control */}
              {showRadius && (
                <div className="bg-[#f8fafc] rounded-[20px] p-6 border border-[#f1f5f9]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <label className={labelClasses}>Search Radius</label>
                      <h4 className="text-[13px] font-bold text-[#1a1a2e] mt-1 font-sans">
                        Coverage Area
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[32px] font-bold text-[#C9973A] tabular-nums font-serif">
                        {radius}
                      </span>
                      <span className="text-[11px] font-bold text-[#94a3b8] ml-1 uppercase font-sans">
                        km
                      </span>
                    </div>
                  </div>

                  <div className="relative h-10 flex items-center px-2">
                    <div className="absolute left-0 right-0 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9973A] transition-all duration-300"
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
                      className="absolute w-7 h-7 bg-white border-[3px] border-[#C9973A] rounded-full shadow-md pointer-events-none transition-all duration-300 flex items-center justify-center"
                      style={{ left: `calc(${radius}% - 14px)` }}
                    >
                      <div className="w-1 h-1 bg-[#C9973A] rounded-full" />
                    </div>
                  </div>

                  <div className="flex justify-between mt-3 px-1">
                    {[1, 25, 50, 75, 100].map((val) => (
                      <span key={val} className="text-[9px] font-bold text-[#94a3b8] font-sans">
                        {val}km
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="w-full py-3.5 bg-[#f8fafc] border border-[#f1f5f9] rounded-xl text-[11px] font-bold text-[#1a1a2e] uppercase tracking-wider hover:bg-[#f1f5f9] transition-all flex items-center justify-center gap-2 font-sans"
              >
                <Navigation
                  className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''} text-[#C9973A]`}
                />
                {isLocating ? 'Scanning...' : 'Re-scan Location'}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4 mb-2 ml-1">
                <div className="w-10 h-10 rounded-xl bg-[rgba(201,151,58,0.08)] flex items-center justify-center text-[#C9973A]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1a1a2e] font-sans">Manual Entry</h3>
                  <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider font-sans">
                    Specify location details
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={labelClasses}>Country</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9973A]" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#f1f5f9] rounded-xl appearance-none font-sans font-bold text-[14px] text-[#1a1a2e] focus:border-[#C9973A]/50 outline-none transition-all"
                    >
                      <option value="Zambia">Zambia</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Province</label>
                    <div className="relative">
                      <Map className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9973A]" />
                      <select
                        value={province}
                        onChange={handleProvinceChange}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#f1f5f9] rounded-xl appearance-none font-sans font-bold text-[14px] text-[#1a1a2e] focus:border-[#C9973A]/50 outline-none transition-all"
                      >
                        <option value="">Select</option>
                        {provinces.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>City</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9973A]" />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={!province}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#f1f5f9] rounded-xl appearance-none font-sans font-bold text-[14px] text-[#1a1a2e] disabled:opacity-50 focus:border-[#C9973A]/50 outline-none transition-all"
                      >
                        <option value="">Select</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Address (Optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-[#C9973A]" />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, building, landmark..."
                      className="w-full pl-11 pr-4 py-4 bg-white border border-[#f1f5f9] rounded-xl font-sans font-bold text-[14px] text-[#1a1a2e] h-24 focus:border-[#C9973A]/50 outline-none transition-all resize-none placeholder:text-[#94a3b8]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 pb-12 flex justify-center sm:justify-end">
          <button
            onClick={handleComplete}
            disabled={!useGps && (!province || !city)}
            className="w-full sm:w-auto sm:px-16 h-13.5 bg-[#C9973A] rounded-[50px] flex items-center justify-center gap-2.5 font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16_rgba(201,151,58,0.35)] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
