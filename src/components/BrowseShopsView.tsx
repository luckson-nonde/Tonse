import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Store, LayoutGrid, Briefcase, Heart } from 'lucide-react';
import { fetchShops, type ShopResult } from '../services/api/shopService';
import { CATEGORIES_DB, getBusinessTypeLabel, type BusinessType } from '../services/categories';
import ShopCard from './ShopCard';
import InlineFilterDropdown from './InlineFilterDropdown';
import owlSearching from '../assets/images/empty-states/owl_searching.webp';
import { useAuth } from '../AuthContext';
import { useFavoriteShops } from '../hooks/useFavoriteShops';

interface BrowseShopsViewProps {
  onSendInquiry: (shop: ShopResult) => void;
  onViewProfile: (shop: ShopResult) => void;
  onSendPurchaseOrder: (shop: ShopResult) => void;
  /** When true, show only the buyer's favorited shops (Favorites tab). */
  favoritesOnly?: boolean;
}

/** Archetypes offered in the "Select Service Type" filter, in menu order. */
const SERVICE_TYPE_ARCHETYPES = [
  'RETAIL',
  'WHOLESALE',
  'REPAIR',
  'SERVICE',
  'RENTAL',
  'BOOKING',
  'EVENTS',
  'ENTERTAINMENT',
  'LABOUR',
] as const;

export default function BrowseShopsView({
  onSendInquiry,
  onViewProfile,
  onSendPurchaseOrder,
  favoritesOnly = false,
}: BrowseShopsViewProps) {
  const { user } = useAuth();
  const { favoriteIds, isFavorite, toggle: toggleFavorite } = useFavoriteShops(user?.id);
  const [shops, setShops] = useState<ShopResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchShops({ limit: 100 })
      .then((r) => setShops(r.data))
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  }, []);

  // Leaf category id → master (industry) id, from the static catalog.
  const categoryParentMap = useMemo(
    () => new Map(CATEGORIES_DB.map((c) => [c.id, c.parentId])),
    []
  );

  // "Choose Industry Category" — the master categories (parentId null),
  // shown only when at least one fetched shop serves a leaf under them.
  // Catalog names use "&"; this directory spells it out as "and".
  const industryOptions = useMemo(() => {
    const present = new Set<string>();
    for (const shop of shops) {
      for (const id of shop.categoryIds ?? []) {
        const parent = categoryParentMap.get(id);
        present.add(parent ?? id); // defensive: id might itself be a master
      }
    }
    return CATEGORIES_DB.filter((c) => c.parentId === null && present.has(c.id))
      .map((c) => ({ value: c.id, label: c.name.replace(/\s*&\s*/g, ' and ') }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [shops, categoryParentMap]);

  // "Select Service Type" — archetypes present across the fetched shops.
  const serviceTypeOptions = useMemo(() => {
    const present = new Set(shops.flatMap((s) => s.archetypes ?? []));
    return SERVICE_TYPE_ARCHETYPES.filter((a) => present.has(a)).map((a) => ({
      value: a,
      label: getBusinessTypeLabel(a as BusinessType),
    }));
  }, [shops]);

  // Client-side filter: favorites + text search + industry + service type.
  const filtered = useMemo(() => {
    let list = shops;
    if (favoritesOnly) {
      list = list.filter((s) => favoriteIds.has(s.id));
    }
    if (selectedIndustry) {
      list = list.filter((s) =>
        (s.categoryIds ?? []).some((id) => (categoryParentMap.get(id) ?? id) === selectedIndustry)
      );
    }
    if (selectedServiceType) {
      list = list.filter((s) => (s.archetypes ?? []).includes(selectedServiceType));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      // Categories display as "and" but the catalog stores "&" — match
      // against both spellings so either phrasing finds the shop.
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          (s.categoryNames ?? []).some(
            (n) =>
              n.toLowerCase().includes(q) ||
              n.replace(/\s*&\s*/g, ' and ').toLowerCase().includes(q),
          ),
      );
    }
    return list;
  }, [shops, search, selectedIndustry, selectedServiceType, categoryParentMap, favoritesOnly, favoriteIds]);

  const hasActiveFilters = !!(search || selectedIndustry || selectedServiceType);
  const selectedIndustryLabel = industryOptions.find((o) => o.value === selectedIndustry)?.label;
  const selectedServiceTypeLabel = serviceTypeOptions.find(
    (o) => o.value === selectedServiceType
  )?.label;

  const clearFilters = () => {
    setSearch('');
    setSelectedIndustry(null);
    setSelectedServiceType(null);
  };

  return (
    <div className="space-y-5">
      {/* Marketplace hero — a distinct storefront-directory banner that sets
          this browse/discovery tab apart from the transactional Inquiries /
          Quotes list views. Search AND both filters live in one white bar
          (the Choose-Specialty search-bar pattern). */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#1B3068] to-[#2a407a] p-6 sm:p-7 text-white shadow-lg">
        {/* Decorative glow lives in its OWN clipped layer — the banner
            itself must not be overflow-hidden, or it cuts off the filter
            dropdown panels that open below the search bar. */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#d49b35]/20 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
              {favoritesOnly ? (
                <Heart className="w-4 h-4 text-[#d49b35] fill-[#d49b35]" />
              ) : (
                <Store className="w-4 h-4 text-[#d49b35]" />
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d49b35]">
              {favoritesOnly ? 'Your Favorites' : 'Marketplace Directory'}
            </p>
          </div>
          <h2 className="text-2xl sm:text-[28px] font-serif font-bold leading-tight">
            {favoritesOnly ? 'Your Favorite Shops' : 'Discover Shops and Providers'}
          </h2>
          <p className="text-white/55 text-[13px] mt-1">
            {favoritesOnly
              ? loading
                ? 'Loading your favorites…'
                : `${favoriteIds.size} saved ${favoriteIds.size === 1 ? 'shop' : 'shops'} · your handpicked list`
              : loading
                ? 'Loading verified shops…'
                : `${shops.length} verified ${shops.length === 1 ? 'shop' : 'shops'} · browse, compare and send an inquiry`}
          </p>

          {/* One white bar: search left, filter dropdowns embedded right.
              On mobile the dropdown pair wraps to a second row inside the
              same bar. Opaque border per the Android Mali rule. */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-2 bg-white border-[1.5px] border-slate-200 rounded-2xl pl-3.5 pr-1.5 py-1.5 focus-within:border-[#C9973A] transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0 py-1.5 sm:py-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by name, category, or location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-[13px] text-[#1a1612] placeholder-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="text-slate-300 hover:text-slate-500 shrink-0 pr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-[#f5f2ed] rounded-[10px] p-[3px] shrink-0">
              <InlineFilterDropdown
                icon={LayoutGrid}
                shortLabel="Industry"
                fullLabel="Choose Industry Category"
                options={industryOptions}
                value={selectedIndustry}
                onChange={setSelectedIndustry}
              />
              <InlineFilterDropdown
                icon={Briefcase}
                shortLabel="Service"
                fullLabel="Select Service Type"
                options={serviceTypeOptions}
                value={selectedServiceType}
                onChange={setSelectedServiceType}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-pulse"
            >
              <div className="relative h-32 bg-slate-200/70">
                <div className="absolute inset-x-0 top-4 flex justify-center">
                  <div className="w-22 h-22 rounded-full bg-slate-100 ring-4 ring-white" />
                </div>
              </div>
              <div className="px-5 pt-4 pb-5 flex flex-col items-center space-y-3">
                <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                <div className="h-6 bg-slate-100 rounded w-16" />
                <div className="flex gap-2 w-full justify-center">
                  <div className="h-5 bg-slate-100 rounded-full w-20" />
                  <div className="h-5 bg-slate-100 rounded-full w-20" />
                </div>
                <div className="h-11 bg-slate-100 rounded-xl w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[50vh]">
          <img
            src={owlSearching}
            alt={favoritesOnly ? 'No favorites yet' : 'No shops found'}
            className="w-44 h-44 object-contain opacity-90 mb-8"
          />
          {favoritesOnly && !hasActiveFilters ? (
            <>
              <p className="text-[17px] font-bold text-slate-700 mb-2">No favorites yet</p>
              <p className="text-[13px] text-slate-400 max-w-xs">
                Tap the <span className="text-[#d49b35] font-semibold">♥</span> on any shop under{' '}
                <span className="font-semibold text-slate-500">All Shops</span> to save it here for quick access.
              </p>
            </>
          ) : hasActiveFilters ? (
            <>
              <p className="text-[17px] font-bold text-slate-700 mb-2">No shops match your filter</p>
              <p className="text-[13px] text-slate-400 mb-5">
                {selectedIndustryLabel && selectedServiceTypeLabel
                  ? `No ${selectedServiceTypeLabel.toLowerCase()} providers in ${selectedIndustryLabel}.`
                  : selectedIndustryLabel
                    ? `No providers registered under "${selectedIndustryLabel}".`
                    : selectedServiceTypeLabel
                      ? `No "${selectedServiceTypeLabel}" providers found.`
                      : `No results for "${search}".`}
              </p>
              <button
                onClick={clearFilters}
                className="px-5 py-2 text-[13px] font-bold text-[#d49b35] bg-[#fdf6e9] border border-[#ecd9b3] rounded-xl hover:bg-[#fcecd4] transition-colors"
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
              <ShopCard
                key={shop.id}
                shop={shop}
                onSendInquiry={onSendInquiry}
                onViewProfile={onViewProfile}
                onSendPurchaseOrder={onSendPurchaseOrder}
                isFavorite={isFavorite(shop.id)}
                onToggleFavorite={(s) => toggleFavorite(s.id)}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 font-medium text-center">
            {filtered.length} shop{filtered.length !== 1 ? 's' : ''} found
            {selectedIndustryLabel ? ` in "${selectedIndustryLabel}"` : ''}
            {selectedServiceTypeLabel ? ` · ${selectedServiceTypeLabel}` : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        </>
      )}
    </div>
  );
}
