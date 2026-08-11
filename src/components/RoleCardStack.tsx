import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface RoleValueProp {
  icon: LucideIcon;
  label: string;
}

export interface RoleBanner {
  /** Card id — resolved to a role + optional subRole by the caller's route map. */
  id: string;
  /** Already-imported artwork URL. Wins over `artKey`/`fallbackImage` when set. */
  image?: string;
  /** Artwork file stem looked up in src/assets/images/onboarding/ (buyer | seller | provider). */
  artKey?: string;
  eyebrow: string;
  headline: string;
  description: string;
  /** Three uniform circular value-prop icons rendered under the description. */
  valueProps: RoleValueProp[];
  /** Pill CTA label, e.g. "Start Buying". */
  cta: string;
  /** Photo used when no artwork file exists for this role. */
  fallbackImage?: string;
  /**
   * `object-position` for the photo. Defaults to `right`, which crops the
   * onboarding banners to their photographic half so the copy baked into the
   * file never doubles the card's own text. Square, centre-composed artwork
   * (the category renders) must override this to `center` or it loses its
   * subject off the left edge.
   */
  focalPoint?: string;
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
 * Role stack — one composed 60/40 card per role: gold tag → serif headline →
 * body → three circular value-prop icons → pill CTA, with crisp photography
 * inset on the right 40%.
 *
 * One column until 1600px, where the right pane (58% of the viewport, less
 * its px-12) finally has room for two. That threshold is load-bearing, not
 * taste: the copy side is 60% of a card less 48px of padding, and the three
 * value-prop icons need 192px (3 × w-14 + 2 × gap-x-3). At 1600px that lands
 * on 194px — the first width where the icon row still fits on one line. Stock
 * 2xl (1536px) gives 183px and breaks it, which is why this is arbitrary.
 */
export default function RoleCardStack({ banners, onSelect }: RoleCardStackProps) {
  return (
    <div className="grid grid-cols-1 gap-6 min-[1600px]:grid-cols-2">
      {banners.map((b) => {
        const art = b.artKey ? artFor(b.artKey) : undefined;
        const photo = b.image ?? art ?? b.fallbackImage;
        return (
          <div
            key={b.id}
            className="group bg-white rounded-3xl overflow-hidden shadow-[0_18px_40px_-24px_rgba(10,25,49,0.35)] hover:shadow-[0_24px_48px_-22px_rgba(10,25,49,0.45)] lg:hover:-translate-y-0.5 transition-all duration-300 ease-in-out"
          >
            {/* Responsive composition. Phones STACK (flex-col-reverse ⇒ the
                photo banner sits on top, full-width copy below) so the text
                finally gets the card's full width and reads cleanly. At sm+
                the card reverts to the composed 60/40 side-by-side (copy left,
                photo right). Either way the photo is cropped to its
                photographic side (object-right) so the copy baked into the
                banner file never duplicates the card's own text — on the
                stacked banner that means a tall-ish squarish crop. DOM order is
                [copy, photo]; flex-col-reverse flips it visually on mobile. */}
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-[3fr_2fr]">
              {/* Copy column — typography + value props + CTA */}
              <div className="p-5 sm:p-6 flex flex-col items-start">
                <span className="px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] text-[10px] sm:text-[9px] font-black uppercase tracking-[0.18em]">
                  {b.eyebrow}
                </span>
                <h3 className="font-serif text-[24px] sm:text-[22px] font-bold text-[#0A1931] leading-[1.15] sm:leading-[1.2] mt-3">
                  {b.headline}
                </h3>
                <p className="text-[13px] sm:text-[12px] text-[#1a1612]/65 sm:text-[#1a1612]/60 leading-relaxed mt-2">
                  {b.description}
                </p>

                <div className="grid grid-cols-3 gap-2 w-full mt-5 sm:mt-4 sm:flex sm:flex-wrap sm:items-start sm:gap-x-3 sm:gap-y-2 sm:w-auto">
                  {b.valueProps.map((vp) => {
                    const Icon = vp.icon;
                    return (
                      <div key={vp.label} className="flex flex-col items-center text-center sm:w-14">
                        <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#fdf6e9] text-[#C9973A] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(201,151,58,0.3)]">
                          <Icon className="w-5 h-5 sm:w-4 sm:h-4" strokeWidth={2} />
                        </div>
                        <span className="text-[11px] sm:text-[9px] font-semibold text-[#1a1612]/60 sm:text-[#1a1612]/55 leading-tight mt-1.5">
                          {vp.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className="mt-6 sm:mt-5 w-full sm:w-auto px-6 h-12 sm:h-11 rounded-full bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white text-[12px] sm:text-[11px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-[#C9973A]/25 transition-all duration-300 ease-in-out hover:from-[#C9973A] hover:to-[#B08432] lg:hover:scale-[1.02] lg:active:scale-[0.98]"
                >
                  {b.cta}
                  <span className="text-sm leading-none">→</span>
                </button>
              </div>

              {/* Photo — full-width banner on mobile (top, via flex-col-reverse),
                  inset right 40% at sm+. object-right keeps the crop on the
                  photographic half at both sizes. */}
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                aria-label={`${b.headline} — ${b.cta}`}
                className="relative block w-full sm:h-full sm:p-3 sm:pl-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 sm:rounded-r-3xl"
              >
                <img
                  src={photo}
                  alt={b.headline}
                  style={{ objectPosition: b.focalPoint ?? 'right' }}
                  className="w-full aspect-[9/10] object-cover sm:aspect-auto sm:h-full sm:min-h-[200px] sm:rounded-2xl transition-transform duration-300 ease-in-out lg:group-hover:scale-[1.01]"
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
