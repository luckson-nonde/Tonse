import React from 'react';
import { MapPin, Star, ArrowRight, BadgeCheck, Heart, ShoppingCart } from 'lucide-react';
import type { ShopResult } from '../services/api/shopService';
import { getBusinessTypeLabel, type BusinessType } from '../services/categories';

interface ShopCardProps {
  shop: ShopResult;
  onSendInquiry: (shop: ShopResult) => void;
  onViewProfile: (shop: ShopResult) => void;
  /** Open the Purchase Order composer for this shop (typed items + price
   *  request). When omitted the button isn't rendered. */
  onSendPurchaseOrder?: (shop: ShopResult) => void;
  /** Favorite (♥) state + toggle. When onToggleFavorite is omitted the heart
   *  isn't rendered (e.g. surfaces where favoriting doesn't apply). */
  isFavorite?: boolean;
  onToggleFavorite?: (shop: ShopResult) => void;
}

/**
 * Storefront card for the Shops (Marketplace Directory) tab.
 *
 * BUSINESS-branded only — the owner's personal profile picture never
 * appears here (it lives on the shop profile page): navy "hat" header
 * carrying the business logo ("LTS"-style monogram until shops get a
 * real logo upload) over a subtle data-pattern texture → circular shop
 * image (the seller's newest product photo) straddling the header seam,
 * rendered only when a real image exists → centered identity block with
 * a large rating number over stars (real review aggregates; "New on
 * Tonse" until the first review) → grey category pills → one dominant
 * Send Inquiry button with a quiet View-profile link under it.
 *
 * Border/ring colors are opaque on purpose — translucent borders on
 * rounded elements mis-rasterize on Mali-GPU Android phones.
 */
export default function ShopCard({
  shop,
  onSendInquiry,
  onViewProfile,
  onSendPurchaseOrder,
  isFavorite = false,
  onToggleFavorite,
}: ShopCardProps) {
  // "LTS"-style monogram — the brand mark for the header circle:
  // first letters of up to three words of the business name.
  const monogram = (shop.name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  // Directory spells "&" out as "and" (matches the filter chips upstream).
  const categories = (shop.categoryNames ?? []).map((n) => n.replace(/\s*&\s*/g, ' and '));
  const isVerified = shop.verificationStatus === 'VERIFIED';
  const hasRating = shop.rating > 0;

  // Summary line: "Verified Tech Services · 24 Reviews" — primary
  // descriptor falls back category name → archetype label → shop type.
  const primaryDescriptor =
    categories[0] ||
    (shop.archetypes?.[0] ? getBusinessTypeLabel(shop.archetypes[0] as BusinessType) : '') ||
    (shop.shopType === 'SERVICE_PROVIDER' ? 'Service Provider' : 'Shop');

  // SVG ids are document-global and the grid renders many cards — the
  // texture pattern id must be unique per card.
  const patternId = `sc-dots-${shop.id}`;

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:border-[#C9973A] hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* ── Blue "hat" header: dominant logo over data-pattern texture ── */}
      <div className="relative h-32 bg-gradient-to-br from-[#1B3068] to-[#2a407a]">
        <svg className="absolute inset-0 w-full h-full opacity-[0.18]" aria-hidden="true">
          <defs>
            <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.2" fill="#ffffff" />
              <circle cx="14" cy="14" r="0.8" fill="#d49b35" />
              <path d="M3 3 L14 14" stroke="#ffffff" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 88% 15%, rgba(212,155,53,0.55) 0%, transparent 55%)' }}
        />
        {/* Favorite (♥) toggle — top-right over the header. stopPropagation so
            it never triggers the card's Send Inquiry / View profile actions. */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(shop);
            }}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remove ${shop.name} from favorites` : `Add ${shop.name} to favorites`}
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-sm transition-colors"
          >
            <Heart
              className={`w-4.5 h-4.5 transition-colors ${
                isFavorite ? 'text-[#d49b35] fill-[#d49b35]' : 'text-white'
              }`}
              strokeWidth={2}
            />
          </button>
        )}
        <div className="absolute inset-x-0 top-4 flex justify-center">
          {shop.logo ? (
            <img
              src={shop.logo}
              alt={`${shop.name} logo`}
              className="w-22 h-22 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-22 h-22 rounded-full bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] ring-4 ring-white shadow-lg flex flex-col items-center justify-center">
              <span className="font-serif font-black text-[#C9973A] text-[22px] leading-none tracking-tight">
                {monogram}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Circular shop image straddling the header seam — only when a
             real product photo exists (a second initial circle under the
             monogram is just noise) ── */}
      {shop.coverImage && (
        <div className="flex justify-center -mt-9 relative z-10">
          <img
            src={shop.coverImage}
            alt={`${shop.name} showcase`}
            className="w-18 h-18 rounded-full object-cover ring-4 ring-white shadow-lg bg-white"
          />
        </div>
      )}

      {/* ── Centered identity + rating block ── */}
      <div className={`px-5 ${shop.coverImage ? 'pt-3' : 'pt-4'} flex flex-col items-center text-center`}>
        <h4 className="font-serif text-[17px] font-bold text-[#1a1612] leading-tight">{shop.name}</h4>
        <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1 max-w-full">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{shop.location}</span>
        </p>

        {hasRating ? (
          <div className="mt-2.5 flex flex-col items-center gap-1">
            <span className="font-serif text-[30px] font-black text-[#1a1612] leading-none">
              {shop.rating.toFixed(1)}
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-3.5 h-3.5 ${
                    n <= Math.round(shop.rating) ? 'text-[#C9973A] fill-[#C9973A]' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-col items-center gap-1">
            <span className="font-serif text-[15px] font-bold text-[#C9973A] leading-none">
              New on Tonse
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="w-3.5 h-3.5 text-slate-200" />
              ))}
            </div>
          </div>
        )}

        <p className="mt-1.5 text-[11px] font-semibold text-slate-400 flex items-center gap-1 max-w-full">
          {isVerified && (
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold shrink-0">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified
            </span>
          )}
          <span className="truncate">{primaryDescriptor}</span>
          {shop.reviewCount > 0 && (
            <span className="shrink-0">· {shop.reviewCount} Review{shop.reviewCount !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>

      {/* ── Category pills ── */}
      {categories.length > 0 && (
        <div className="px-5 pt-3 flex items-center justify-center gap-1.5 flex-wrap">
          {categories.slice(0, 3).map((name, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-full"
            >
              {name}
            </span>
          ))}
          {categories.length > 3 && (
            <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200 rounded-full">
              +{categories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* ── Action area pinned to the bottom ── */}
      <div className="mt-auto px-5 pb-4 pt-4 flex flex-col items-center gap-1.5">
        <button
          onClick={() => onSendInquiry(shop)}
          className="w-full py-3 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 bg-[#1B3068] text-white hover:bg-[#152554] shadow-md"
        >
          Send Inquiry <ArrowRight className="w-3.5 h-3.5" />
        </button>
        {onSendPurchaseOrder && (
          <button
            onClick={() => onSendPurchaseOrder(shop)}
            className="w-full py-3 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 bg-[#C9973A] text-white hover:bg-[#b8851d] shadow-md"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Send Purchase Order
          </button>
        )}
        <button
          onClick={() => onViewProfile(shop)}
          className="py-1 text-[11px] font-semibold text-slate-400 hover:text-[#C9973A] transition-colors"
        >
          View profile
        </button>
      </div>
    </div>
  );
}
