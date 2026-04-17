import React from 'react';
import { Search, SlidersHorizontal, Check, Star, ShoppingBag, ArrowLeft, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';

export default function SuppliersPage() {
  const navigate = useNavigate();
  const shops = useLiveQuery(() => db.shops.toArray()) || [];

  return (
    <div className="flex flex-col space-y-8 max-w-3xl mx-auto pb-24 px-4 pt-2">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#d49b35] transition-colors" />
          <input 
            type="text" 
            placeholder="Search premium retailers and boutiques..." 
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] text-sm font-medium text-[#1a1612] placeholder:text-slate-400 transition-all"
          />
        </div>
        <button className="w-14 h-[54px] bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#1a1612] hover:border-slate-300 transition-all flex-shrink-0">
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto gap-8 pb-2 scrollbar-hide border-b border-slate-100">
        {['All', 'Chain Stores', 'Fashion', 'Electronics', 'Hardware'].map((cat, i) => (
          <button 
            key={cat} 
            className={`pb-4 text-sm font-bold whitespace-nowrap relative transition-colors ${i === 0 ? 'text-[#1a1612]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {cat}
            {i === 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d49b35] rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Shop Cards */}
      <div className="space-y-8">
        {shops.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-slate-200">
            <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No suppliers found yet.</p>
          </div>
        ) : (
          shops.map((shop) => (
            <div 
              key={shop.id} 
              className="bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:border-[#d49b35]/30 group relative cursor-pointer"
              onClick={() => navigate(`/buyer/shop-details?id=${shop.id}`)}
            >
              {/* Cover Image & Anchored Logo */}
              <div className="h-48 sm:h-64 w-full relative overflow-hidden">
                <img src={shop.coverImage} alt={shop.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80"></div>
                
                {/* Rating Badge */}
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                  <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-white/20">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${star <= Math.round(shop.rating) ? 'text-[#d49b35] fill-[#d49b35]' : 'text-slate-300 fill-slate-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-[#1a1612] ml-0.5">{shop.rating}</span>
                    <span className="text-[10px] font-bold text-slate-400">({shop.reviewCount})</span>
                  </div>
                </div>

                {/* Overlapping Logo - Extruding up into the cover image */}
                <div className="absolute -bottom-4 left-4 sm:-bottom-6 sm:left-6 z-10">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 shadow-md border border-slate-100 group-hover:ring-2 ring-[#d49b35]/50 transition-all duration-300">
                    {shop.logo ? (
                      <img src={shop.logo} alt={shop.name} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-slate-50 flex items-center justify-center text-[#d49b35] font-serif font-bold text-xl sm:text-2xl tracking-widest border border-slate-100">
                        {shop.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Content Section - Stacked Layout */}
              <div className="px-5 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-6 relative flex flex-col gap-4">
                {/* Shop Info */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1a1612] line-clamp-1 group-hover:text-[#d49b35] transition-colors">{shop.name}</h3>
                    {shop.isVerified && (
                      <div className="bg-emerald-50 text-emerald-600 p-1 rounded-full border border-emerald-100 shrink-0" title="Verified Shop">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500">
                    <span className="font-bold text-[#d49b35] text-[10px] sm:text-xs uppercase tracking-widest shrink-0">{shop.category}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{shop.location}</span>
                    </div>
                  </div>
                </div>

                {/* Description Snippet */}
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {shop.description}
                </p>

                {/* Action Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tap to view details</span>
                  <button className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#d49b35] text-[#1a1612] hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors group/btn">
                    Visit Shop
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
