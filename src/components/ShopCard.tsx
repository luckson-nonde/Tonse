import React from 'react';
import { MapPin, Star, Users, ArrowRight, Tag } from 'lucide-react';
import type { ShopResult } from '../services/api/shopService';

interface ShopCardProps {
  shop: ShopResult;
  onSendInquiry: (shop: ShopResult) => void;
  onViewProfile: (shop: ShopResult) => void;
}

export default function ShopCard({ shop, onSendInquiry, onViewProfile }: ShopCardProps) {
  const initial = (shop.name || 'S').charAt(0).toUpperCase();
  const shortRef = shop.id.replace(/-/g, '').slice(0, 6).toUpperCase();

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4 hover:shadow-md hover:border-[#C9973A]/30 transition-all duration-300">

      {/* Header: avatar + name + followers */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          {shop.logo ? (
            <img
              src={shop.logo}
              alt={shop.name}
              className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg shrink-0">
              {initial}
            </div>
          )}
          <div>
            <h4 className="text-[15px] font-bold text-[#1a1612] leading-tight">{shop.name}</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{shop.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 shrink-0 mt-1">
          <Users className="w-3.5 h-3.5" />
          {shop.followerCount.toLocaleString()}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-slate-100 via-slate-100 to-transparent" />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4">
        {shop.rating > 0 ? (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1.5 bg-[#C9973A]/10 rounded-lg text-[#C9973A] shrink-0">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rating</p>
              <p className="text-[11px] font-bold text-[#1a1612]">
                {shop.rating.toFixed(1)}
                <span className="font-normal text-slate-400"> · {shop.reviewCount} reviews</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1.5 bg-slate-50 rounded-lg text-slate-400 shrink-0">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rating</p>
              <p className="text-[11px] font-medium text-slate-400 italic">No reviews yet</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 bg-blue-50 rounded-lg text-blue-500 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
            <p className="text-[11px] font-bold text-slate-700 truncate">{shop.location}</p>
          </div>
        </div>
      </div>

      {/* Description excerpt */}
      {shop.description && (
        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C9973A]/30 rounded-l-xl" />
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 pl-1">{shop.description}</p>
        </div>
      )}

      {/* Category tags */}
      {(shop.categoryNames ?? []).length > 0 && (
        <div className="flex items-start gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          {(shop.categoryNames ?? []).slice(0, 4).map((name, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 text-[10px] font-semibold bg-[#fdf6e9] text-[#C9973A] border border-[#C9973A]/20 rounded-full"
            >
              {name}
            </span>
          ))}
          {(shop.categoryNames ?? []).length > 4 && (
            <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200 rounded-full">
              +{(shop.categoryNames ?? []).length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Footer: ref + CTAs */}
      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">SHP-{shortRef}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewProfile(shop)}
            className="flex-1 py-2.5 text-[13px] font-bold rounded-xl border border-slate-200 text-slate-600 hover:border-[#C9973A]/40 hover:text-[#C9973A] transition-all"
          >
            View Profile
          </button>
          <button
            onClick={() => onSendInquiry(shop)}
            className="flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 bg-[#1a1612] text-white hover:bg-black shadow-md hover:-translate-y-0.5"
          >
            Send Inquiry <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
