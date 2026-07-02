import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface RoleValueProp {
  icon: LucideIcon;
  label: string;
}

export interface RoleBanner {
  /** Master-role id ('BUYER' | 'SELLER' | 'SERVICE_PROVIDER'). */
  id: string;
  /** Artwork file stem looked up in src/assets/images/onboarding/ (buyer | seller | provider). */
  artKey: string;
  eyebrow: string;
  headline: string;
  description: string;
  /** Three uniform circular value-prop icons rendered under the description. */
  valueProps: RoleValueProp[];
  /** Pill CTA label, e.g. "Start Buying". */
  cta: string;
  /** Photo used when no artwork file exists for this role. */
  fallbackImage: string;
}

/**
 * Role artwork lives in src/assets/images/onboarding/ (see its README).
 * The 60/40 card crops the banner to its photographic right side
 * (object-right), so the baked-in text never doubles the card's own copy.
 */
const BANNER_ART = import.meta.glob('../assets/images/onboarding/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function artFor(key: string): string | undefined {
  for (const [path, url] of Object.entries(BANNER_ART)) {
    const stem = path.split('/').pop()?.replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase();
    if (stem === key) return url;
  }
  return undefined;
}

interface RoleCardStackProps {
  banners: RoleBanner[];
  /** Selecting a card advances straight into that role's flow. */
  onSelect: (id: string) => void;
}

/**
 * Vertical role stack — one composed 60/40 card per role, straight down the
 * column: gold tag → serif headline → body → three circular value-prop
 * icons → pill CTA, with crisp photography inset on the right 40%.
 */
export default function RoleCardStack({ banners, onSelect }: RoleCardStackProps) {
  return (
    <div className="flex flex-col gap-6">
      {banners.map((b) => {
        const photo = artFor(b.artKey) ?? b.fallbackImage;
        return (
          <div
            key={b.id}
            className="group bg-white rounded-3xl overflow-hidden shadow-[0_18px_40px_-24px_rgba(10,25,49,0.35)] hover:shadow-[0_24px_48px_-22px_rgba(10,25,49,0.45)] hover:-translate-y-0.5 transition-all duration-300 ease-in-out"
          >
            {/* Mobile: stacked (wide photo on top, text below). sm+: 60/40 split. */}
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-[3fr_2fr]">
              {/* Text column — typography + value props + CTA */}
              <div className="p-5 pt-3 sm:p-6 flex flex-col items-start">
                <span className="px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] text-[9px] font-black uppercase tracking-[0.18em]">
                  {b.eyebrow}
                </span>
                <h3 className="font-serif text-[20px] sm:text-[22px] font-bold text-[#0A1931] leading-[1.2] mt-3">
                  {b.headline}
                </h3>
                <p className="text-[12px] text-[#1a1612]/60 leading-relaxed mt-2">
                  {b.description}
                </p>

                <div className="grid grid-cols-3 gap-2 w-full mt-4 sm:flex sm:flex-wrap sm:items-start sm:gap-x-3 sm:gap-y-2 sm:w-auto">
                  {b.valueProps.map((vp) => {
                    const Icon = vp.icon;
                    return (
                      <div key={vp.label} className="flex flex-col items-center text-center sm:w-14">
                        <div className="w-9 h-9 rounded-full bg-[#fdf6e9] text-[#C9973A] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(201,151,58,0.3)]">
                          <Icon className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <span className="text-[9px] font-semibold text-[#1a1612]/55 leading-tight mt-1.5">
                          {vp.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className="mt-5 w-full sm:w-auto px-6 h-12 sm:h-11 rounded-full bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white text-[11px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-[#C9973A]/25 transition-all duration-300 ease-in-out hover:from-[#C9973A] hover:to-[#B08432] hover:scale-[1.02] active:scale-[0.98]"
                >
                  {b.cta}
                  <span className="text-sm leading-none">→</span>
                </button>
              </div>

              {/* Right 40% — photography, rounded + inset in the card */}
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                aria-label={`${b.headline} — ${b.cta}`}
                className="relative h-44 sm:h-full p-3 sm:pl-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 rounded-t-3xl sm:rounded-r-3xl sm:rounded-tl-none"
              >
                <img
                  src={photo}
                  alt={b.headline}
                  className="w-full h-full sm:min-h-[200px] object-cover object-[70%_center] sm:object-right rounded-2xl transition-transform duration-300 ease-in-out group-hover:scale-[1.01]"
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
