import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import Logo from './Logo';
import { CATEGORIES_DB } from '../services/categories';
import { useCategoryAvailability } from '../services/categories/availability';

/**
 * MarketplaceShowcase — the permanent "what's inside ProQuote" panel shown on
 * every authentication screen (Login + all registration steps), so users see
 * the marketplace's categories and live businesses before they even sign in.
 *
 * Two variants:
 *  - "panel"  — the desktop left column (navy gradient, light logo, footer).
 *    It renders identically across /login and every registration step, which
 *    is what makes route changes read as "only the right side changed".
 *  - "inline" — the mobile version, rendered BELOW the active form (the form
 *    keeps priority; the showcase invites scrolling).
 */

// Category tile artwork: exact-id files in assets/images/categories/ win;
// fall back to the legacy numbered icons; finally a lettered tile.
const CATEGORY_ART = import.meta.glob('../assets/images/categories/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const LEGACY_CATEGORY_ART = import.meta.glob(
  '../assets/images/empty-states/category_select_icon/*.png',
  { eager: true, import: 'default' },
) as Record<string, string>;

function categoryArt(id: string): string | undefined {
  const norm = id.toLowerCase();
  for (const [path, url] of Object.entries(CATEGORY_ART)) {
    const stem = path.split('/').pop()?.replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase();
    if (stem === norm) return url;
  }
  const legacyStem = norm.replace(/-/g, '_');
  for (const [path, url] of Object.entries(LEGACY_CATEGORY_ART)) {
    const stem = path
      .split('/')
      .pop()
      ?.replace(/\.png$/i, '')
      .replace(/^\d+_/, '')
      .toLowerCase();
    if (stem === legacyStem) return url;
  }
  return undefined;
}

interface FeaturedShop {
  id: string;
  name: string;
  location?: string;
  logo?: string;
  rating?: number;
}

// Module-level cache: the showcase mounts on every auth route, and the whole
// point is that it looks uninterrupted when navigating Login ⇄ Registration —
// so fetch the featured shops once per session, not once per route change.
let shopsCache: FeaturedShop[] | null = null;

function useFeaturedShops(): FeaturedShop[] {
  const [shops, setShops] = useState<FeaturedShop[]>(shopsCache ?? []);
  useEffect(() => {
    if (shopsCache) return;
    // Raw fetch on purpose: these are pre-auth pages and apiClient's 401
    // handler force-redirects to /login. Teaser only — fail silently.
    const base = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
    fetch(`${base}/shops?isActive=true&limit=6`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = j?.data?.data ?? j?.data ?? [];
        if (Array.isArray(list) && list.length > 0) {
          shopsCache = list.slice(0, 6);
          setShops(shopsCache);
        }
      })
      .catch(() => {});
  }, []);
  return shops;
}

export default function MarketplaceShowcase({
  variant,
}: {
  variant: 'panel' | 'inline' | 'ribbon';
}) {
  const { isAvailable, disabledIds } = useCategoryAvailability();
  const popularCategories = useMemo(
    () => CATEGORIES_DB.filter((c) => !c.parentId && isAvailable(c.id)).slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabledIds],
  );
  const shops = useFeaturedShops();

  if (variant === 'panel') {
    return (
      <div className="w-full h-full flex flex-col justify-between bg-gradient-to-b from-[#0A1931] to-[#14294B] p-10 xl:p-12 overflow-y-auto scrollbar-hide">
        <div className="shrink-0">
          <Logo variant="light" className="text-3xl" />
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#E5BA73] mt-2">
            The Marketplace
          </p>
        </div>

        <div className="my-8 space-y-9">
          <h2 className="font-serif text-[26px] xl:text-[30px] font-bold text-white leading-[1.2] max-w-[360px]">
            Everything Zambia trades, in one place.
          </h2>

          {/* Popular Categories */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#E5BA73] shrink-0">
                Popular Categories
              </p>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {popularCategories.map((cat) => {
                const art = categoryArt(cat.id);
                return (
                  <div key={cat.id} className="flex flex-col items-center gap-1.5">
                    <div className="w-full aspect-square rounded-2xl bg-white overflow-hidden flex items-center justify-center shadow-[inset_0_2px_6px_rgba(10,25,49,0.08),0_10px_22px_-12px_rgba(0,0,0,0.45)] transition-all duration-300 ease-in-out">
                      {art ? (
                        <img src={art} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-serif font-black text-[#C9973A] text-xl">
                          {cat.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-white/60 text-center leading-tight line-clamp-1 w-full">
                      {cat.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Featured Businesses */}
          {shops.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#E5BA73] shrink-0">
                  Featured Businesses
                </p>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="space-y-2.5">
                {shops.slice(0, 3).map((shop) => (
                  <div
                    key={shop.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm"
                  >
                    {shop.logo ? (
                      <img
                        src={shop.logo}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-white/15 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D5A547] to-[#C9973A] flex items-center justify-center font-serif font-black text-white shrink-0">
                        {(shop.name || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-white leading-tight truncate">
                        {shop.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/45">
                        {typeof shop.rating === 'number' && shop.rating > 0 && (
                          <span className="inline-flex items-center gap-0.5 font-bold text-white/70">
                            <Star className="w-3 h-3 text-[#C9973A] fill-[#C9973A]" />
                            {shop.rating.toFixed(1)}
                          </span>
                        )}
                        {shop.location && (
                          <span className="inline-flex items-center gap-0.5 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{shop.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] font-medium text-white/40 shrink-0">
          <span>© 2026 ProQuote Zambia Marketplace</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            End-to-end encrypted
          </span>
        </div>
      </div>
    );
  }

  // ── ribbon (mobile, ABOVE the form) — the collapsed left panel: one
  // horizontally scrollable row of category tiles. ──
  if (variant === 'ribbon') {
    return (
      <div className="flex gap-4 overflow-x-auto snap-x scrollbar-hide -mx-1 px-1 pb-1">
        {popularCategories.map((cat) => {
          const art = categoryArt(cat.id);
          return (
            <div key={cat.id} className="snap-start shrink-0 w-16 flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden flex items-center justify-center shadow-[inset_0_2px_6px_rgba(10,25,49,0.08),0_6px_14px_-8px_rgba(26,22,18,0.3)]">
                {art ? (
                  <img src={art} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif font-black text-[#C9973A] text-lg">
                    {cat.name.charAt(0)}
                  </span>
                )}
              </div>
              <p className="text-[9px] font-semibold text-[#1a1612]/60 text-center leading-tight line-clamp-1 w-full">
                {cat.name}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // ── inline (mobile, below the active form) — Featured Businesses only;
  // the categories already appear in the top ribbon. ──
  return (
    <div className="mt-10 space-y-8">
      {shops.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C9973A] shrink-0">
              Featured Businesses
            </p>
            <div className="h-px flex-1 bg-[#e8e4dc]" />
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x scrollbar-hide -mx-1 px-1 pb-2">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="snap-start shrink-0 w-40 bg-white border border-[#e8e4dc] rounded-2xl p-3.5 shadow-sm"
              >
                {shop.logo ? (
                  <img
                    src={shop.logo}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e8e4dc] mb-2.5"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] flex items-center justify-center font-serif font-black text-[#C9973A] mb-2.5">
                    {(shop.name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="text-[12px] font-bold text-[#1a1612] leading-tight truncate">
                  {shop.name}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#1a1612]/50">
                  {typeof shop.rating === 'number' && shop.rating > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-[#1a1612]/70">
                      <Star className="w-3 h-3 text-[#C9973A] fill-[#C9973A]" />
                      {shop.rating.toFixed(1)}
                    </span>
                  )}
                  {shop.location && (
                    <span className="inline-flex items-center gap-0.5 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{shop.location}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
