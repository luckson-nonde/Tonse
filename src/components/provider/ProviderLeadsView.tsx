import React, { useRef, useState } from 'react';
import { MapPin, Eye, ChevronDown, ChevronUp, Package } from 'lucide-react';
import emptyLeadsImage from '../../assets/images/empty-states/owl_reading.png';
import { uniqueKey } from '../../utils/keyUtils';
import { PreferenceTags, ThumbnailGrid } from './LeadsHelpers';
import QuoteSubmissionForm from './QuoteSubmissionForm';
import { recordInquiryView } from '../../services/api/inquiryService';
import { getBusinessTypes } from '../../services/categories';

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
function InquiryDetails({
  lead,
  parsedItems,
  quotingInquiryId,
  itemPrices,
  onSetItemPrices,
  renderSpecifications,
  idx,
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
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap gap-2.5">
        {(lead.category || '').split(', ').map((cat: string, catIdx: number) => (
          <span
            key={uniqueKey('cat', undefined, `${lead.id}-${catIdx}`)}
            className="px-3 py-1 bg-[#fdf6e9] text-[#d49b35] text-[10px] font-black rounded-lg uppercase tracking-[0.15em] border border-[#d49b35]/10 shadow-sm"
          >
            {cat}
          </span>
        ))}
      </div>

      {lead.description && (
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[17px] text-slate-900 leading-relaxed font-bold">{lead.description}</p>
        </div>
      )}

      {lead.preferences && Object.keys(lead.preferences).length > 0 && (
        <div className="pt-2">
          <PreferenceTags preferences={lead.preferences} />
        </div>
      )}

      <div className="h-px bg-slate-100 my-2" />

      {lead.attributes && Object.keys(lead.attributes).length > 0 && (() => {
        const cleaned = stripMediaKeys(lead.attributes);
        return Object.keys(cleaned).length > 0
          ? <div className="text-sm">{renderSpecifications(cleaned, lead.category || '', 'Inquiry Details')}</div>
          : null;
      })()}
      {lead.entertainmentData && (() => {
        const cleaned = stripMediaKeys(lead.entertainmentData);
        return Object.keys(cleaned).length > 0
          ? <div className="text-sm">{renderSpecifications(cleaned, lead.category || '', 'Event Specifications')}</div>
          : null;
      })()}
      {lead.repairData && (() => {
        const cleaned = stripMediaKeys(lead.repairData);
        return Object.keys(cleaned).length > 0
          ? <div className="text-sm">{renderSpecifications(cleaned, lead.category || '', 'Repair Specifications')}</div>
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

// ─── Divider ─────────────────────────────────────────────────────────────────
const VDivider = () => (
  <div className="hidden lg:block w-px bg-[#e8e0d0] self-stretch shrink-0 mx-1" />
);

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

  const isWholesale = getBusinessTypes(user as any).includes('WHOLESALE');

  // Dynamic layout calculations based on leads volume
  const leadsCount = leads.length;
  const isRelaxed = leadsCount > 0 && leadsCount <= 4;
  const isCompact = leadsCount > 8;

  const containerSpacing = isRelaxed ? 'space-y-6' : 'space-y-2';
  const rowPadding = isRelaxed ? 'py-14' : isCompact ? 'py-2.5' : 'py-4';
  const cardRadius = isRelaxed ? 'rounded-[32px]' : 'rounded-xl';
  const titleTextSize = isRelaxed ? 'text-2xl' : isCompact ? 'text-sm' : 'text-base';
  const tagTextSize = isRelaxed ? 'text-xs' : 'text-[9px]';
  const tagPadding = isRelaxed ? 'px-4 py-2' : 'px-2 py-0.5';
  const metaTextSize = isRelaxed ? 'text-sm' : 'text-[10px]';
  const metaIconSize = isRelaxed ? 'w-5 h-5' : 'w-3 h-3';
  const dateTextSize = isRelaxed ? 'text-sm' : 'text-[10px]';
  const chevronSize = isRelaxed ? 'w-6 h-6' : 'w-4 h-4';

  // Variant toggle visibility: hide for single-archetype owners (nothing
  // to switch between) and for staff with assignedArchetype (locked
  // server-side). Multi-archetype owners get the pill row.
  const showVariantToggle =
    !variantLocked && Array.isArray(variantOptions) && variantOptions.length > 1;

  return (
    <div className={containerSpacing}>
      {/* Variant pill row — multi-archetype owners only */}
      {showVariantToggle && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Showing:
          </span>
          {variantOptions!.map((opt) => {
            const isActive = selectedVariant === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSetSelectedVariant?.(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  isActive
                    ? 'bg-[#C9973A] text-white border-[#C9973A] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSetSelectedVariant?.(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              !selectedVariant
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            All
          </button>
        </div>
      )}

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
            {isWholesale ? 'Purchase Requests' : 'Booking Requests'}
          </h2>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Based on your categories:{' '}
            <span className="text-[#d49b35]">{user?.categories?.join(', ') || 'All Categories'}</span>
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

            return (
              <div
                key={uniqueKey('lead', lead.id, idx)}
                className={`bg-white ${cardRadius} border shadow-sm overflow-hidden transition-all duration-200 ${selectedInquiryIds.includes(lead.id!) ? 'border-[#d49b35]' : 'border-slate-100'}`}
              >
                {/* ── Compact row ── */}
                <div
                  className={`flex items-center gap-4 px-5 ${rowPadding} cursor-pointer hover:bg-slate-50/70 transition-colors`}
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedLeadId(null);
                    } else {
                      handleExpand(lead.id!, Number(lead.viewCount ?? 0));
                    }
                  }}
                >
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
                  <span className={`hidden sm:inline-block ${tagPadding} bg-[#fdf6e9] text-[#d49b35] ${tagTextSize} font-black rounded-lg uppercase tracking-wider shrink-0 max-w-[120px] truncate border border-[#d49b35]/10`}>
                    {(lead.category || '').split(', ')[0]}
                  </span>
                  <span className={`flex-1 ${titleTextSize} font-bold text-slate-900 truncate`}>{lead.title}</span>
                  {parsedItems.length > 0 && (
                    <span className={`hidden md:flex items-center gap-1.5 ${metaTextSize} font-bold text-slate-500 shrink-0`}>
                      <Package className={metaIconSize} />{parsedItems.length} item{parsedItems.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={`hidden lg:block ${metaTextSize} font-bold text-slate-500 shrink-0 max-w-[130px] truncate`}>{lead.buyerName}</span>
                  <span className={`hidden md:flex items-center gap-1.5 ${metaTextSize} font-bold text-slate-500 shrink-0`}>
                    <MapPin className={metaIconSize} />{lead.location}
                  </span>
                  <span className={`${dateTextSize} font-bold text-slate-400 shrink-0`}>{new Date(lead.createdAt).toLocaleDateString()}</span>
                  {isExpanded ? <ChevronUp className={`${chevronSize} text-slate-400 shrink-0`} /> : <ChevronDown className={`${chevronSize} text-slate-400 shrink-0`} />}
                </div>

                {/* ── Expanded panel — adaptive layout engine ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4">

                    {/* RULE 1: No images, no form → single column */}
                    {!hasImages && !isQuoting && (
                      <div>
                        <InquiryDetails lead={lead} parsedItems={parsedItems} quotingInquiryId={quotingInquiryId} itemPrices={itemPrices} onSetItemPrices={onSetItemPrices} renderSpecifications={renderSpecifications} idx={idx} />
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-slate-400 text-[10px]"><Eye className="w-3 h-3" />{renderViewCount(lead)} views</div>
                          <button onClick={() => onSetQuotingInquiryId(lead.id!)} className="px-5 py-2 bg-[#d49b35] text-white text-xs font-bold rounded-xl hover:bg-[#a37d35] transition-all shadow-md active:scale-95">
                            {isWholesale ? 'Quote for Supply' : 'Submit Quote'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* RULE 2: Images present, no form → 65/35 two-column */}
                    {hasImages && !isQuoting && (
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-[65] min-w-0">
                          <InquiryDetails lead={lead} parsedItems={parsedItems} quotingInquiryId={quotingInquiryId} itemPrices={itemPrices} onSetItemPrices={onSetItemPrices} renderSpecifications={renderSpecifications} idx={idx} />
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-slate-400 text-[10px]"><Eye className="w-3 h-3" />{renderViewCount(lead)} views</div>
                            <button onClick={() => onSetQuotingInquiryId(lead.id!)} className="px-5 py-2 bg-[#d49b35] text-white text-xs font-bold rounded-xl hover:bg-[#a37d35] transition-all shadow-md active:scale-95">
                              {isWholesale ? 'Quote for Supply' : 'Submit Quote'}
                            </button>
                          </div>
                        </div>
                        <VDivider />
                        <div className="flex-[35] lg:pt-0 pt-3 lg:border-t-0 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Photos</p>
                          <ThumbnailGrid images={allImages} maxVisible={6} compact columns={2} />
                        </div>
                      </div>
                    )}

                    {/* RULE 3: No images, form open → 55/45 two-column */}
                    {!hasImages && isQuoting && (
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-[55] min-w-0">
                          <InquiryDetails lead={lead} parsedItems={parsedItems} quotingInquiryId={quotingInquiryId} itemPrices={itemPrices} onSetItemPrices={onSetItemPrices} renderSpecifications={renderSpecifications} idx={idx} />
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-slate-400 text-[10px]"><Eye className="w-3 h-3" />{renderViewCount(lead)} views</div>
                            <button onClick={() => onSetQuotingInquiryId(null)} className="px-3 py-1.5 text-[10px] text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                              Cancel Quote
                            </button>
                          </div>
                        </div>
                        <VDivider />
                        <div className="flex-[45] lg:max-h-[80vh] lg:overflow-y-auto">
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
                      </div>
                    )}

                    {/* RULE 4: Images + form open → 45/20/35 three-zone */}
                    {hasImages && isQuoting && (
                      <div className="flex flex-col lg:flex-row gap-0">
                        {/* Zone 1 — inquiry details 45% */}
                        <div className="lg:w-[45%] min-w-0 p-1 lg:pr-3">
                          <InquiryDetails lead={lead} parsedItems={parsedItems} quotingInquiryId={quotingInquiryId} itemPrices={itemPrices} onSetItemPrices={onSetItemPrices} renderSpecifications={renderSpecifications} idx={idx} />
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-slate-400 text-[10px]"><Eye className="w-3 h-3" />{renderViewCount(lead)} views</div>
                            <button onClick={() => onSetQuotingInquiryId(null)} className="px-3 py-1.5 text-[10px] text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                              Cancel
                            </button>
                          </div>
                        </div>
                        <VDivider />
                        {/* Zone 2 — thumbnails 20% */}
                        <div className="lg:w-[20%] shrink-0 flex flex-col gap-2 pt-3 lg:pt-1 lg:px-5 border-t lg:border-t-0 border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Photos</p>
                          <ThumbnailGrid images={allImages} maxVisible={4} compact columns={1} />
                        </div>
                        <VDivider />
                        {/* Zone 3 — quote form 35% */}
                        <div className="lg:w-[35%] shrink-0 pt-3 lg:pt-0 lg:pl-3 lg:max-h-[75vh] lg:overflow-y-auto border-t lg:border-t-0 border-slate-100">
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
                      </div>
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
