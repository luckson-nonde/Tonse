import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Store } from 'lucide-react';
import { fetchShops, type ShopResult } from '../services/api/shopService';
import ShopCard from './ShopCard';
import owlSearching from '../assets/images/empty-states/owl_searching.png';

interface BrowseShopsViewProps {
  onSendInquiry: (shop: ShopResult) => void;
  onViewProfile: (shop: ShopResult) => void;
}

export default function BrowseShopsView({ onSendInquiry, onViewProfile }: BrowseShopsViewProps) {
  const [shops, setShops] = useState<ShopResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchShops({ limit: 100 })
      .then((r) => setShops(r.data))
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  }, []);

  // Derive unique categories from returned shops — chips only appear
  // for categories that have at least one registered provider.
  const availableCategories = useMemo(() => {
    const seen = new Map<string, string>(); // id → display name
    for (const shop of shops) {
      const ids = shop.categoryIds ?? [];
      const names = shop.categoryNames ?? [];
      ids.forEach((id, i) => {
        if (id && !seen.has(id)) seen.set(id, names[i] || id);
      });
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shops]);

  // Client-side filter: text search + active category chip
  const filtered = useMemo(() => {
    let list = shops;
    if (activeCategory) {
      list = list.filter((s) => (s.categoryIds ?? []).includes(activeCategory));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          (s.categoryNames ?? []).some((n) => n.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [shops, search, activeCategory]);

  const activeCategoryName = availableCategories.find((c) => c.id === activeCategory)?.name;

  return (
    <div className="space-y-5">
      {/* Marketplace hero — a distinct storefront-directory banner that sets
          this browse/discovery tab apart from the transactional Inquiries /
          Quotes list views, with the search integrated into the banner. */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B3068] to-[#2a407a] p-6 sm:p-7 text-white shadow-lg">
        <div
          className="absolute -right-12 -top-12 w-48 h-48 bg-[#d49b35]/20 rounded-full blur-2xl pointer-events-none"
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
              <Store className="w-4 h-4 text-[#d49b35]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d49b35]">
              Marketplace Directory
            </p>
          </div>
          <h2 className="text-2xl sm:text-[28px] font-serif font-bold leading-tight">
            Discover Shops &amp; Providers
          </h2>
          <p className="text-white/55 text-[13px] mt-1">
            {loading
              ? 'Loading verified shops…'
              : `${shops.length} verified ${shops.length === 1 ? 'shop' : 'shops'} · browse, compare & send an inquiry`}
          </p>

          {/* Integrated search */}
          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, category, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-[14px] text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/40 focus:border-[#d49b35]/60 focus:bg-white/15 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category filter chips — derived from actual registered providers */}
      {!loading && availableCategories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </div>
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
              !activeCategory
                ? 'bg-[#1a1612] text-white border-[#1a1612]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            All
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#d49b35] text-white border-[#d49b35]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#d49b35]/50 hover:text-[#d49b35]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-pulse"
            >
              <div className="h-20 bg-slate-200/70" />
              <div className="px-5 -mt-9 relative">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 ring-4 ring-white" />
              </div>
              <div className="px-5 pt-3 pb-5 space-y-3">
                <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="flex gap-2 pt-1">
                  <div className="h-9 bg-slate-100 rounded-xl flex-1" />
                  <div className="h-9 bg-slate-100 rounded-xl flex-[1.4]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[50vh]">
          <img
            src={owlSearching}
            alt="No shops found"
            className="w-44 h-44 object-contain opacity-90 mb-8"
          />
          {search || activeCategory ? (
            <>
              <p className="text-[17px] font-bold text-slate-700 mb-2">No shops match your filter</p>
              <p className="text-[13px] text-slate-400 mb-5">
                {activeCategory
                  ? `No providers registered under "${activeCategoryName}".`
                  : `No results for "${search}".`}
              </p>
              <button
                onClick={() => { setSearch(''); setActiveCategory(null); }}
                className="px-5 py-2 text-[13px] font-bold text-[#d49b35] bg-[#fdf6e9] border border-[#d49b35]/20 rounded-xl hover:bg-[#fcecd4] transition-colors"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-[17px] font-bold text-slate-700 mb-2">No shops registered yet</p>
              <p className="text-[13px] text-slate-400">
                Shops and service providers will appear here once they register.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onSendInquiry={onSendInquiry} onViewProfile={onViewProfile} />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 font-medium text-center">
            {filtered.length} shop{filtered.length !== 1 ? 's' : ''} found
            {activeCategoryName ? ` in "${activeCategoryName}"` : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        </>
      )}
    </div>
  );
}
