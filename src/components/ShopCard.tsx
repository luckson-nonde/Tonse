import React from 'react';
import { MapPin, Star, Users, ArrowRight } from 'lucide-react';
import type { ShopResult } from '../services/api/shopService';

interface ShopCardProps {
  shop: ShopResult;
  onSendInquiry: (shop: ShopResult) => void;
  onViewProfile: (shop: ShopResult) => void;
}

/**
 * Storefront-style card for the Shops (Marketplace Directory) tab.
 *
 * Deliberately structured differently from the flat white "data row" cards
 * used by the Inquiries / Quotes tabs: a navy cover banner with an
 * overlapping avatar gives this browse/discovery surface a distinct,
 * storefront feel so the tab reads as a marketplace, not a list.
 */
export default function ShopCard({ shop, onSendInquiry, onViewProfile }: ShopCardProps) {
  const initial = (shop.name || 'S').charAt(0).toUpperCase();
  const shortRef = shop.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const categories = shop.categoryNames ?? [];

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:border-[#C9973A]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Cover banner — the storefront signature */}
      <div className="relative h-20 bg-gradient-to-br from-[#1B3068] to-[#2a407a]">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 88% 15%, rgba(212,155,53,0.55) 0%, transparent 55%)' }}
        />
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20">
          <Users className="w-3 h-3" />
          {shop.followerCount.toLocaleString()}
        </div>
      </div>

      {/* Avatar overlapping the banner */}
      <div className="px-5 -mt-9 relative z-10">
        {shop.logo ? (
          <img
            src={shop.logo}
            alt={shop.name}
            className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-md"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] ring-4 ring-white shadow-md flex items-center justify-center font-serif font-black text-[#C9973A] text-2xl">
            {initial}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pt-3 pb-5 flex flex-col gap-3 flex-1">
        <div>
          <h4 className="text-[16px] font-bold text-[#1a1612] leading-tight">{shop.name}</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{shop.location}</span>
          </p>
        </div>

        {/* Rating + reference strip */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {shop.rating > 0 ? (
            <span className="inline-flex items-center gap-1 font-bold text-[#1a1612]">
              <Star className="w-3.5 h-3.5 text-[#C9973A] fill-[#C9973A]" />
              {shop.rating.toFixed(1)}
              <span className="font-normal text-slate-400">({shop.reviewCount})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 italic">
              <Star className="w-3.5 h-3.5" /> No reviews yet
            </span>
          )}
          <span className="text-slate-200">·</span>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">SHP-{shortRef}</span>
        </div>

        {shop.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{shop.description}</p>
        )}

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.slice(0, 3).map((name, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 text-[10px] font-semibold bg-[#fdf6e9] text-[#C9973A] border border-[#C9973A]/20 rounded-full"
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

        {/* CTAs pinned to the bottom regardless of body length */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <button
            onClick={() => onViewProfile(shop)}
            className="flex-1 py-2.5 text-[13px] font-bold rounded-xl border border-slate-200 text-slate-600 hover:border-[#C9973A]/40 hover:text-[#C9973A] transition-all"
          >
            View
          </button>
          <button
            onClick={() => onSendInquiry(shop)}
            className="flex-[1.4] py-2.5 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 bg-[#1B3068] text-white hover:bg-[#152554] shadow-md"
          >
            Send Inquiry <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
