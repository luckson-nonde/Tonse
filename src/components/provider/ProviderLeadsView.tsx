import React, { useRef, useState } from 'react';
import { MapPin, Eye, Tag, ArrowRight, MessageSquare, Package } from 'lucide-react';
import emptyLeadsImage from '../../assets/images/empty-states/owl_reading.png';
import { uniqueKey } from '../../utils/keyUtils';
import { PreferenceTags, Lightbox } from './LeadsHelpers';
import QuoteSubmissionForm from './QuoteSubmissionForm';
import { recordInquiryView } from '../../services/api/inquiryService';
import {
  getEffectiveBusinessType,
  getEffectiveBusinessTypes,
  CATEGORIES_DB,
} from '../../services/categories';
import { useActiveProfileContext } from '../../hooks/useActiveProfileContext';

// ─── Collect all images from a lead ──────────────────────────────────────────
function collectLeadImages(lead: any, parsedItems: any[]): string[] {
  const imgs: string[] = [];
  const parse = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
      try { return JSON.parse(val); } catch { return []; }
    }
    if (typeof val === 'string' && val.includes(',')) return val.split(',').map(s => s.trim());
    return val ? [val] : [];
  };

  imgs.push(...parse(lead.referencePhotos));
  imgs.push(...parse(lead.images));

  if (lead.attributes) {
    imgs.push(...parse(lead.attributes.images));
    imgs.push(...parse(lead.attributes.referencePhotos));
    imgs.push(...parse(lead.attributes.photos));
  }
  if (lead.entertainmentData) imgs.push(...parse(lead.entertainmentData.images));
  if (lead.repairData) imgs.push(...parse(lead.repairData.images));

  parsedItems.forEach((item: any) => {
    imgs.push(...parse(item.images));
  });

  return imgs.filter(img => typeof img === 'string' && img.length > 5);
}

// ─── Inquiry detail panel (read-only) ─────────────────────────────────────────
//
// Renders just the facts. The category pill row used to live here too,
// duplicating the pill already shown in the compact row's header — pulled
// out so the expanded panel reads as one continuous header → body, not
// two stacked headers.
function InquiryDetails({
  lead,
  parsedItems,
  quotingInquiryId,
  itemPrices,
  onSetItemPrices,
  renderSpecifications,
}: any) {
  const stripMediaKeys = (obj: Record<string, any>) => {
    const MEDIA_KEYWORDS = ['photo', 'image', 'img', 'attachment', 'media', 'budget', 'zmw', 'video', 'file', 'proof'];
    const isUrl = (v: any) => typeof v === 'string' && /^https?:\/\/|^\/|\.(jpg|jpeg|png|gif|webp|mp4|mov|pdf)$/i.test(v);
    const isUrlArray = (v: any) => Array.isArray(v) && v.length > 0 && isUrl(v[0]);

    return Object.fromEntries(
      Object.entries(obj).filter(([k, v]) => {
        const keyLower = k.toLowerCase();
        if (MEDIA_KEYWORDS.some(word => keyLower.includes(word))) return false;
        if (isUrl(v) || isUrlArray(v)) return false;
        return true;
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Pre-fix inquiries persisted the literal "No description provided."
          sentinel into the description column (BuyerDashboard used it as
          a default before the form-derivation fix). Filter it here so
          legacy rows render the same as new empty-description rows. */}
      {lead.description && lead.description.trim() !== 'No description provided.' && (
        <p className="text-[15px] text-slate-700 leading-relaxed font-medium border-l-2 border-[#d49b35]/40 pl-4">
          {lead.description}
        </p>
      )}

      {lead.preferences && Object.keys(lead.preferences).length > 0 && (
        <PreferenceTags preferences={lead.preferences} />
      )}

      {/* Prefer the stable categoryId — getCategorySchema accepts both
          ids and names, but the legacy `category` display string can be
          a comma-joined blob (e.g. "Mobile Phones & Accessories (Repair)")
          while categoryIds[0] is the canonical "mobile-phones-repair"
          slug. Without an id, the lookup falls back to the generic
          schema and only renders brand/quantity/urgency. */}
      {lead.attributes && Object.keys(lead.attributes).length > 0 && (() => {
        const cleaned = stripMediaKeys(lead.attributes);
        const cat = (lead as any).categoryIds?.[0] || lead.category || '';
        return Object.keys(cleaned).length > 0
          ? renderSpecifications(cleaned, cat, 'Inquiry Details')
          : null;
      })()}
      {lead.entertainmentData && (() => {
        const cleaned = stripMediaKeys(lead.entertainmentData);
        const cat = (lead as any).categoryIds?.[0] || lead.category || '';
        return Object.keys(cleaned).length > 0
          ? renderSpecifications(cleaned, cat, 'Event Specifications')
          : null;
      })()}
      {lead.repairData && (() => {
        const cleaned = stripMediaKeys(lead.repairData);
        const cat = (lead as any).categoryIds?.[0] || lead.category || '';
        return Object.keys(cleaned).length > 0
          ? renderSpecifications(cleaned, cat, 'Repair Specifications')
          : null;
      })()}

      {parsedItems.length > 0 && (
        <div className="space-y-4 pt-4">
          <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#d49b35]" />
            Requested Items ({parsedItems.length})
          </p>
          <div className="grid grid-cols-1 gap-4">
            {parsedItems.map((item: any, itemIdx: number) => (
              <div
                key={uniqueKey('item', item.id, `${lead.id}-${itemIdx}`)}
                className="flex items-start gap-4 px-4 py-4 bg-white rounded-2xl border-2 border-slate-50 shadow-sm hover:border-[#d49b35]/20 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-black text-slate-900 truncate">{item.title}</span>
                    <span className="text-xs font-black text-white bg-[#d49b35] px-3 py-1.5 rounded-xl shrink-0 shadow-sm">×{item.quantity}</span>
                  </div>
                  {item.description && <p className="text-sm text-slate-700 font-bold line-clamp-3 leading-relaxed mb-3">{item.description}</p>}
                  <div className="flex flex-wrap gap-x-8 gap-y-4">
                    {item.brand && (
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-1">Brand</span>
                        <span className="text-[15px] font-black text-[#d49b35]">{item.brand}</span>
                      </div>
                    )}
                    {item.material && (
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-1">Material</span>
                        <span className="text-[15px] font-black text-slate-900">{item.material}</span>
                      </div>
                    )}
                    {item.dimensions && (
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-1">Size</span>
                        <span className="text-[15px] font-black text-slate-900">{item.dimensions}</span>
                      </div>
                    )}
                  </div>
                </div>

                {quotingInquiryId === lead.id && (
                  <div className="shrink-0">
                    <input
                      id={`item-price-${lead.id}-${itemIdx}`}
                      type="number"
                      placeholder="0.00"
                      value={itemPrices[`${lead.id}-${itemIdx}`] || ''}
                      onChange={(e) => onSetItemPrices({ ...itemPrices, [`${lead.id}-${itemIdx}`]: Number(e.target.value) })}
                      className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-[#d49b35] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Photo strip (premium horizontal gallery) ────────────────────────────────
//
// Replaces the old 3-zone layout's middle column where photos were
// squeezed into a 20%-wide vertical stack of unreadable thumbnails.
// Photos now run as a single full-width horizontal strip directly under
// the header band — large enough to actually identify (140px square),
// uniformly cropped, with a deterministic overflow indicator.
function PhotoStrip({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  if (!images || images.length === 0) return null;
  const VISIBLE = 6;
  const overflow = images.length - VISIBLE;
  const visible = images.slice(0, VISIBLE);
  const isVideo = (src: string) => /\.(mp4|webm|mov|avi)$/i.test(src);
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.22em]">
        Photos · {images.length}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {visible.map((src, i) => {
          const isLast = i === visible.length - 1 && overflow > 0;
          return (
            <button
              key={`thumb-${i}`}
              type="button"
              onClick={() => onOpen(i)}
              className="relative w-[140px] h-[140px] shrink-0 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#d49b35]/40 transition-colors group"
            >
              {isVideo(src) ? (
                <video src={src} className="w-full h-full object-cover" />
              ) : (
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              )}
              {isLast && (
                <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center backdrop-blur-[1px]">
                  <span className="text-white text-[20px] font-black">+{overflow}</span>
                </div>
              )}
              {!isLast && (
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface ProviderLeadsViewProps {
  user: any;
  leads: any[];
  isSelectionMode: boolean;
  selectedInquiryIds: number[];
  quotingInquiryId: number | null;
  itemPrices: Record<string, number>;
  venueSpaces: any[];
  /** Variant toggle (Phase 2.2): owner's archetype set, the currently
   *  selected variant, the setter, and a lock flag for staff. When
   *  variantOptions has length <=1 OR variantLocked is true, the
   *  toggle hides — single-archetype owners and assigned staff have
   *  nothing to switch. */
  variantOptions?: string[];
  selectedVariant?: string;
  onSetSelectedVariant?: (variant: string | undefined) => void;
  variantLocked?: boolean;
  onArchiveSelected: () => void;
  onDeleteSelected: () => void;
  onSetSelectionMode: (value: boolean) => void;
  onSetSelectedInquiryIds: (ids: number[]) => void;
  onSetItemPrices: (prices: Record<string, number>) => void;
  onSetQuotingInquiryId: (id: number | null) => void;
  onQuoteSubmit: (leadId: any, data: any) => void;
  renderSpecifications: (data: any, category: string, title: string) => React.ReactNode;
  revisingQuote: any | null;
  onSetRevisingQuote: (quote: any | null) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProviderLeadsView({
  user,
  leads,
  isSelectionMode,
  selectedInquiryIds,
  quotingInquiryId,
  itemPrices,
  venueSpaces,
  variantOptions,
  selectedVariant,
  onSetSelectedVariant,
  variantLocked,
  onArchiveSelected,
  onDeleteSelected,
  onSetSelectionMode,
  onSetSelectedInquiryIds,
  onSetItemPrices,
  onSetQuotingInquiryId,
  onQuoteSubmit,
  renderSpecifications,
  revisingQuote,
  onSetRevisingQuote,
}: ProviderLeadsViewProps) {
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  // Lightbox state for the photo strip — keyed by lead id so each
  // expanded row owns its own gallery without conflict.
  const [lightbox, setLightbox] = useState<{ leadId: number; index: number } | null>(null);
  // Local viewCount overrides keyed by lead id so the UI bumps optimistically
  // the moment a provider expands a row, even before the next leads refresh.
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  // Record each (provider, inquiry) at most once per session so re-expanding
  // the same row doesn't pad the counter — the backend would no-op anyway,
  // but skipping the call avoids unnecessary network chatter.
  const trackedRef = useRef<Set<string>>(new Set());

  const handleExpand = (leadId: number, currentCount: number) => {
    setExpandedLeadId(leadId);
    const key = String(leadId);
    if (trackedRef.current.has(key)) return;
    if (user?.role === 'BUYER' || user?.role === 'ADMIN') return;
    trackedRef.current.add(key);
    // Optimistic bump — the response will reconcile if the server didn't count it.
    setViewCounts((prev) => ({ ...prev, [key]: (prev[key] ?? currentCount) + 1 }));
    recordInquiryView(leadId).then((res) => {
      if (!res) return;
      setViewCounts((prev) => ({ ...prev, [key]: res.viewCount }));
    });
  };

  const renderViewCount = (lead: any) => {
    const key = String(lead.id);
    return viewCounts[key] ?? lead.viewCount ?? 0;
  };

  // Persona-aware: drives the page H2 and the "Based on your
  // categories" subtitle. The H2 switches by archetype (Buyer
  // Inquiries / Repair Requests / etc.) and the subtitle scopes
  // the visible categories to the active persona's archetype so
  // a seller in RETAIL mode sees their RETAIL categories, not the
  // full category list.
  const { context: activeContext } = useActiveProfileContext();
  const effectiveType = getEffectiveBusinessType(user as any, activeContext);
  const isWholesale = getEffectiveBusinessTypes(user as any, activeContext).includes('WHOLESALE');

  const headerTitle = (() => {
    switch (effectiveType) {
      case 'WHOLESALE':     return 'Purchase Requests';
      case 'REPAIR':        return 'Repair Requests';
      case 'SERVICE':       return 'Service Requests';
      case 'EVENTS':        return 'Event Bookings';
      case 'ENTERTAINMENT': return 'Performance Bookings';
      case 'RETAIL':        return 'Buyer Inquiries';
      default:              return 'Booking Requests';
    }
  })();

  // Subtitle source: prefer categoryIds (stable IDs from the catalog)
  // resolved to display names. Filter by the active persona's
  // archetype using the catalog's `type` field (`buy` / `repair` /
  // `restore`) — frontend Category rows don't carry the full
  // archetype enum, so this is the best signal we have. RETAIL keeps
  // `buy` and parent rows (no type); REPAIR keeps `repair` + `restore`;
  // other personas don't filter (show everything matching).
  const visibleCategoryNames = (() => {
    const ids: string[] | undefined = (user as any)?.categoryIds;
    if (Array.isArray(ids) && ids.length > 0) {
      const matched = ids
        .map((id) => CATEGORIES_DB.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .filter((c) => {
          if (effectiveType === 'RETAIL') {
            // Keep buy variants and parent rows (no type), drop repair.
            return c.type !== 'repair' && c.type !== 'restore';
          }
          if (effectiveType === 'REPAIR') {
            return c.type === 'repair' || c.type === 'restore';
          }
          return true;
        })
        .map((c) => c.name);
      if (matched.length > 0) return matched;
    }
    const legacy = (user as any)?.categories;
    return Array.isArray(legacy) && legacy.length > 0 ? legacy : null;
  })();

  // Dynamic layout calculations based on leads volume.
  //
  // Premium spec: rhythm scales with density, but the typography ramp
  // stays predictable. Compact mode tightens row padding and shrinks
  // meta — but title weight, pill treatment, and disclosure chevron
  // stay on the same scale across modes so the inbox doesn't read as
  // "two different products" when the count crosses 8 leads.
  const leadsCount = leads.length;
  const isRelaxed = leadsCount > 0 && leadsCount <= 4;

  const containerSpacing = isRelaxed ? 'space-y-4' : 'space-y-3';
  const cardRadius = 'rounded-2xl';

  // The in-view variant pill row is gone. The Profile popover in the
  // sidebar is now the single switch — having two competing controls
  // confused users (popover said RETAIL, pill row said REPAIR, leads
  // came back filtered to whichever fired last). Staff still see a
  // locked indicator since they can't switch at all.
  // variantOptions / selectedVariant / onSetSelectedVariant props are
  // kept on the interface for now but unused — drop on next refactor.
  void variantOptions;
  void selectedVariant;
  void onSetSelectedVariant;

  return (
    <div className={containerSpacing}>
      {/* Locked indicator — staff with assignedArchetype */}
      {variantLocked && user?.assignedArchetype && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Filtered to:
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-xs">
            {user.assignedArchetype}
          </span>
          <span className="italic">(your shop owner restricted this view)</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">
            {headerTitle}
          </h2>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Based on your categories:{' '}
            <span className="text-[#d49b35]">
              {visibleCategoryNames ? visibleCategoryNames.join(', ') : 'No categories matched'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode && selectedInquiryIds.length > 0 && (
            <>
              <button onClick={onArchiveSelected} className="px-3 py-1.5 text-xs font-bold text-white bg-[#d49b35] rounded-md hover:bg-[#b8862d] transition-colors">
                Archive {selectedInquiryIds.length}
              </button>
              <button onClick={onDeleteSelected} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors">
                Delete {selectedInquiryIds.length}
              </button>
            </>
          )}
          <button
            onClick={() => { onSetSelectionMode(!isSelectionMode); onSetSelectedInquiryIds([]); }}
            className="px-3 py-1.5 text-xs font-bold text-[#d49b35] bg-[#fdf6e9] rounded-md hover:bg-[#fcecd4] transition-colors"
          >
            {isSelectionMode ? 'Cancel' : 'Select'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className={containerSpacing}>
        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[40vh] shadow-sm">
            <img src={emptyLeadsImage} alt="No leads" className="w-36 h-36 object-contain opacity-90 mb-6" />
            {(!user?.categories || user.categories.length === 0) ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-2">
                  Profile Incomplete
                </p>
                <p className="text-[15px] font-bold text-[#1a1612] mb-1.5">
                  Add your business categories
                </p>
                <p className="text-[13px] text-[#1a1612]/55 max-w-sm leading-snug">
                  We match inquiries to your selected categories. Until you add at least one,
                  we can't show you matched booking requests.
                </p>
              </>
            ) : (
              <p className="text-slate-500 font-medium">No booking requests at the moment.</p>
            )}
          </div>
        ) : (
          leads.map((lead, idx) => {
            const parsedItems = Array.isArray(lead.items)
              ? lead.items
              : typeof lead.items === 'string'
              ? (() => { try { return JSON.parse(lead.items); } catch { return []; } })()
              : [];
            const isExpanded = expandedLeadId === lead.id;
            const allImages = collectLeadImages(lead, parsedItems);
            const hasImages = allImages.length > 0;
            const isQuoting = quotingInquiryId === lead.id;
            const itemPricesTotal = parsedItems.some((_: any, i: number) => itemPrices[`${lead.id}-${i}`])
              ? parsedItems.reduce((s: number, _: any, i: number) => s + Number(itemPrices[`${lead.id}-${i}`] || 0), 0)
              : 0;

            const fullCategory = (lead.category || '').split(', ')[0];
            const budget = Number((lead.attributes as any)?.budget_limit || (lead.attributes as any)?.budgetLimit || 0);
            const daysAgo = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
            const descText = lead.description && lead.description.trim() !== 'No description provided.' ? lead.description.trim() : '';
            const iqrRef = (lead as any).displayId || String(lead.id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
            return (
              <div
                key={uniqueKey('lead', lead.id, idx)}
                className={`bg-white ${cardRadius} border shadow-sm overflow-hidden transition-all duration-200 ${selectedInquiryIds.includes(lead.id!) ? 'border-[#d49b35]' : isExpanded ? 'border-[#d49b35]/30 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}
              >
                {/* ── Card header (QuoteCard pattern) ── */}
                <div className="p-5 flex flex-col gap-4">
                  {/* Row 1: Buyer info + Budget */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedInquiryIds.includes(lead.id!)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) onSetSelectedInquiryIds([...selectedInquiryIds, lead.id!]);
                            else onSetSelectedInquiryIds(selectedInquiryIds.filter((id) => id !== lead.id!));
                          }}
                          className="w-5 h-5 accent-[#d49b35] shrink-0"
                        />
                      )}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-base shrink-0">
                        {((lead as any).buyerName || 'B').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-slate-900 leading-tight">
                          {(lead as any).buyerName || 'Buyer'}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {budget > 0 ? (
                        <>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Budget</p>
                          <div className="flex items-start justify-end">
                            <span className="text-[11px] font-bold text-slate-400 mt-0.5 mr-0.5">ZMW</span>
                            <span className="text-xl font-black text-slate-900 tracking-tight leading-none">
                              {budget.toLocaleString()}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 italic">No budget set</span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <p className="text-[15px] font-bold text-slate-800 leading-snug -mt-1">{lead.title}</p>

                  {/* Divider */}
                  <div className="h-px w-full bg-gradient-to-r from-slate-100 via-slate-100 to-transparent" />

                  {/* Details grid: category + location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-[#C9973A]/10 rounded-lg text-[#C9973A] shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Category</p>
                        <p className="text-[11px] font-bold text-slate-900 truncate">{fullCategory || 'General'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-blue-50 rounded-lg text-blue-500 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                        <p className="text-[11px] font-bold text-slate-700">{lead.location || (lead as any).city || 'Lusaka'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description excerpt */}
                  {descText && (
                    <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C9973A]/30 rounded-l-xl" />
                      <div className="flex gap-2.5">
                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">"{descText}"</p>
                      </div>
                    </div>
                  )}

                  {/* Footer: reference + items + CTA */}
                  <div className="flex justify-between items-center pt-1">
                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      IQR-{iqrRef}
                    </div>
                    <div className="flex items-center gap-3">
                      {parsedItems.length > 0 && (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                          <Package className="w-3.5 h-3.5" />
                          {parsedItems.length} item{parsedItems.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (isExpanded) setExpandedLeadId(null);
                          else handleExpand(lead.id!, Number(lead.viewCount ?? 0));
                        }}
                        className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                          isExpanded
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-[#1a1612] text-white hover:bg-black shadow-md hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Expanded panel ──
                    Single coherent layout: photo strip on top, body below.
                    Body is 1-column when no quote form, 2-column (60/40)
                    when the quote form is open. No internal scroll, no
                    competing columns, no truncated content. */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30">
                    {hasImages && (
                      <div className="px-6 pt-6">
                        <PhotoStrip
                          images={allImages}
                          onOpen={(i) => setLightbox({ leadId: lead.id!, index: i })}
                        />
                      </div>
                    )}

                    <div className={`px-6 ${hasImages ? 'pt-8' : 'pt-6'} pb-6 grid gap-10 ${isQuoting ? 'lg:grid-cols-[1fr_minmax(360px,420px)]' : 'grid-cols-1'}`}>
                      {/* Left column — inquiry facts + footer */}
                      <div className="min-w-0">
                        <InquiryDetails
                          lead={lead}
                          parsedItems={parsedItems}
                          quotingInquiryId={quotingInquiryId}
                          itemPrices={itemPrices}
                          onSetItemPrices={onSetItemPrices}
                          renderSpecifications={renderSpecifications}
                        />
                        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                            <Eye className="w-3.5 h-3.5" />
                            {renderViewCount(lead)} {renderViewCount(lead) === 1 ? 'view' : 'views'}
                          </div>
                          {!isQuoting ? (
                            <button
                              onClick={() => onSetQuotingInquiryId(lead.id!)}
                              className="px-6 py-2.5 bg-[#d49b35] text-white text-[13px] font-bold rounded-xl hover:bg-[#b8851d] transition-colors shadow-sm active:scale-[0.98]"
                            >
                              {isWholesale ? 'Quote for Supply' : 'Submit Quote'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onSetQuotingInquiryId(null);
                                onSetRevisingQuote(null);
                              }}
                              className="text-[12px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              Cancel quote
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right column — quote form (only when quoting) */}
                      {isQuoting && (
                        <div className="lg:border-l lg:border-slate-200 lg:pl-10 min-w-0">
                          <QuoteSubmissionForm
                            inquiry={lead}
                            onSubmit={(data) => onQuoteSubmit(lead.id!, data)}
                            onCancel={() => {
                              onSetQuotingInquiryId(null);
                              onSetRevisingQuote(null);
                            }}
                            venueSpaces={venueSpaces}
                            user={user}
                            itemPricesTotal={itemPricesTotal}
                            initialValues={revisingQuote?.dynamicFields}
                            parentQuoteId={revisingQuote?.id}
                          />
                        </div>
                      )}
                    </div>

                    {lightbox && lightbox.leadId === lead.id && (
                      <Lightbox
                        images={allImages}
                        startIndex={lightbox.index}
                        onClose={() => setLightbox(null)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
