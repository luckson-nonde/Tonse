import React, { useEffect, useState } from 'react';
import { MapPin, Clock, CheckCircle2, Eye, Users, Star } from 'lucide-react';
import Button from './Button';
import { ARCHETYPE_CONFIG } from '../services/archetypeConfig';
import { getCategorySchema } from '../services/categories';
import { isLoanContext } from '../utils/loan';
import SecureFile, { isSecureFileUrl } from './SecureFile';

interface InquiryCardProps {
  inquiry: any;
  state: 'open' | 'quoted' | 'paid';
  quoteCount?: number;
  paidQuote?: any;
  onAction: () => void;
  onDelete: () => void;
  /** Buyer action: surface the reserved (overflow) quote batch. Rendered
   *  only when `inquiry.reserveCount > 0`. */
  onReleaseReserve?: () => void;
  /** Order-history only: opens the rate-shop modal. Shown when the order
   *  is DELIVERED/COMPLETED and this handler is provided. */
  onRate?: () => void;
  /** Order-history only: this order already has a review — show a quiet
   *  "Rated" state instead of the button. */
  alreadyRated?: boolean;
}

export default function InquiryCard({
  inquiry,
  state,
  quoteCount = 0,
  paidQuote,
  onAction,
  onDelete,
  onReleaseReserve,
  onRate,
  alreadyRated,
}: InquiryCardProps) {
  // Inquiries no longer carry a `category` string column — they live
  // in the inquiry_categories junction. The buyer endpoint hydrates
  // `category` and `categoryIds` (parallel to the matching service);
  // until every read path is updated, fall back across both fields so
  // this card keeps rendering instead of crashing on `.replace()` of
  // undefined.
  const categoryKey: string =
    inquiry.category || inquiry.categoryIds?.[0] || '';
  const schema = getCategorySchema(categoryKey);
  const archetypeConfig = ARCHETYPE_CONFIG[categoryKey] || {
    archetype: 'PRODUCT',
    categoryName: categoryKey,
  };

  // Loan requests speak lending terminology (offers/lenders, not
  // quotes/suppliers) — see [[tonse-architecture]] loan spine.
  const isLoan = isLoanContext(
    categoryKey,
    inquiry.categoryIds,
    inquiry.title,
    archetypeConfig.categoryName,
  );
  const views = inquiry.viewCount ?? 0;

  const borderColors = {
    open: 'border-t-[#d49b35]',
    quoted: 'border-t-[#3b82f6]',
    paid: 'border-t-[#22c55e]',
  };

  const badgeColors = {
    open: 'bg-[#d49b35]/10 text-[#d49b35]',
    quoted: 'bg-[#3b82f6]/10 text-[#3b82f6]',
    paid: 'bg-[#22c55e]/10 text-[#22c55e]',
  };

  const statusText = {
    open: 'OPEN',
    quoted: 'QUOTED',
    paid: 'COMPLETED',
  };

  // Attributes are now normalized at the service layer
  const parsedAttributes = inquiry.attributes || {};

  // Filter attributes to display (exclude images, title, budget_limit if handled separately)
  const displayAttributes = parsedAttributes
    ? Object.entries(parsedAttributes).filter(([key, value]) => {
        // Exclude empty, falsy, or whitespace values
        if (!value || value === '') return false;
        // Exclude empty arrays
        if (Array.isArray(value) && value.length === 0) return false;
        // Exclude empty objects
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
          return false;
        // Exclude specific fields
        if (['images', 'title'].includes(key)) return false;
        return true;
      })
    : [];

  const getLabel = (key: string) => {
    const field = schema.find((f) => f.name === key);
    return field
      ? field.label
      : key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };

  const formatValue = (key: string, value: any) => {
    if (key === 'budget_limit') return `ZMW ${Number(value || 0).toLocaleString()}`;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      if (typeof value[0] === 'object') {
        // Array of objects - return count
        return `${value.length} item${value.length !== 1 ? 's' : ''}`;
      }
      return value.join(', ');
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      const objKeys = Object.keys(value);
      if (objKeys.length === 0) return '—';
      // Return a formatted string of key-value pairs
      return objKeys.map((k) => `${k}: ${value[k]}`).join(' • ');
    }

    return String(value);
  };

  // Image attachments: the schema types these fields `image_upload` and stores
  // an array (or single string) of upload paths. Fall back to an extension
  // sniff when the schema is missing so a stray image url still renders as a
  // picture instead of the raw "/api/uploads/…jpg" text.
  const getType = (key: string) => schema.find((f) => f.name === key)?.type;
  const asImageUrls = (value: any): string[] =>
    (Array.isArray(value) ? value : [value]).filter(
      (u) => typeof u === 'string' && u.trim(),
    );
  const isImageField = (key: string, value: any) => {
    if (getType(key) === 'image_upload') return true;
    const urls = asImageUrls(value);
    return urls.length > 0 && urls.every((u) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(u));
  };

  return (
    <div
      className={`bg-[#fdfaf6] rounded-3xl border border-slate-200 border-t-4 ${borderColors[state]} shadow-sm overflow-hidden flex flex-col`}
    >
      <div className="p-6 grow">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[11px] font-bold text-[#d49b35] tracking-widest uppercase font-sans">
            {archetypeConfig.categoryName}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${badgeColors[state]}`}
            >
              {statusText[state]}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Delete button clicked for inquiry:', inquiry.id);
                onDelete();
              }}
              className="px-2 py-1 text-[9px] font-bold bg-rose-500 text-white rounded-full hover:bg-rose-600"
            >
              Delete
            </button>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-brand-dark font-serif mb-2 leading-tight">
          {(() => {
            const title =
              inquiry.title ||
              (inquiry.attributes && inquiry.attributes.title) ||
              'Untitled Inquiry';
            // Replace & with "and"
            return title.replace(/&/g, 'and');
          })()}
        </h3>

        <div className="flex items-center text-slate-500 text-sm font-sans mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          Lusaka, Lusaka
        </div>

        {/* Slot + countdown strip — providers only need to see this on
            OPEN leads (the ones they can still quote on). Updates once
            per second so the time-remaining ticks live; slot count
            ticks each /inquiries/leads/me poll (every 8s) as peers
            quote on the same inquiry. */}
        {state === 'open' && (inquiry.maxQuotes || inquiry.responseDeadlineAt) && (
          <UrgencyStrip
            maxQuotes={inquiry.maxQuotes}
            quoteCount={inquiry.quoteCount}
            reserveCount={inquiry.reserveCount}
            responseDeadlineAt={inquiry.responseDeadlineAt}
          />
        )}
        {!(state === 'open' && (inquiry.maxQuotes || inquiry.responseDeadlineAt)) && (
          <div className="mb-3" />
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d49b35]"></div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-sans">
            {isLoan
              ? 'LOAN REQUEST · REVIEWED BY LICENSED LENDERS'
              : `${archetypeConfig.archetype} SCHEMA${categoryKey ? ` · ${categoryKey.replace(/-/g, ' ')} ARCHETYPE` : ''}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {displayAttributes.map(([key, value]) => {
            // Image attachments render as a thumbnail grid (tap to open the
            // full file in a new tab) instead of printing the raw upload path.
            if (isImageField(key, value)) {
              const urls = asImageUrls(value);
              if (urls.length === 0) return null;
              return (
                <div key={key} className="col-span-2 bg-[#f4efe8] rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans mb-2">
                    {getLabel(key)}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {urls.map((url, idx) =>
                      // Sensitive docs (payslips, statements) are auth-gated and
                      // may be PDFs — SecureFile fetches them with the token and
                      // renders an image or a "PDF · Open" tile. A plain <a>/<img>
                      // here would 401. Public reference photos stay as-is.
                      isSecureFileUrl(url) ? (
                        <div
                          key={`${url}-${idx}`}
                          onClick={(e) => e.stopPropagation()}
                          className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white"
                        >
                          <SecureFile
                            url={url}
                            alt={`${getLabel(key)} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <a
                          key={`${url}-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white block transition-shadow hover:shadow-md"
                        >
                          <img
                            src={url}
                            alt={`${getLabel(key)} ${idx + 1}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ),
                    )}
                  </div>
                </div>
              );
            }
            const isLongText = typeof value === 'string' && value.length > 30;
            return (
              <div
                key={key}
                className={`bg-[#f4efe8] rounded-xl p-3 ${isLongText ? 'col-span-2' : 'col-span-1'}`}
              >
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans mb-1">
                  {getLabel(key)}
                </p>
                {isSecureFileUrl(value) ? (
                  <SecureFile url={value} asLink />
                ) : (
                  <p className="text-sm text-brand-dark font-medium font-sans">
                    {formatValue(key, value)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {state === 'open' && (
          <div className="bg-[#f4efe8] rounded-xl p-3 flex items-center gap-2 text-slate-500 text-sm font-medium font-sans">
            <Clock className="w-4 h-4" />
            {isLoan ? "Awaiting offers from lenders" : 'Awaiting responses from suppliers'}
          </div>
        )}

        {/* Dispatch telemetry — how the provider network is behaving on
            this request: providers who ACCEPTED the alert vs quotes
            actually submitted. Hydrated by the buyer endpoint and ticked
            live over the SSE stream. */}
        {state !== 'paid' &&
          (inquiry.acceptedCount != null || inquiry.quoteCount != null) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#d49b35]/10 border border-[#d49b35]/20 px-3 py-1.5 rounded-full">
                <Users className="w-3.5 h-3.5 text-[#d49b35]" />
                <span className="text-xs font-bold text-[#b5852f] font-sans">
                  {inquiry.acceptedCount ?? 0} accepted
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                <span className="text-xs font-bold text-blue-700 font-sans">
                  {inquiry.quoteCount ?? 0}
                  {inquiry.maxQuotes ? `/${inquiry.maxQuotes}` : ''} quoted
                </span>
              </div>
              {Number(inquiry.reserveCount) > 0 && onReleaseReserve && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReleaseReserve();
                  }}
                  className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 font-sans hover:bg-emerald-100 transition-colors"
                >
                  Show {inquiry.reserveCount} reserved quote
                  {Number(inquiry.reserveCount) === 1 ? '' : 's'}
                </button>
              )}
            </div>
          )}

        {state === 'paid' && paidQuote && (
          <div className="space-y-4">
            <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-3 flex items-center gap-2 text-[#16a34a] text-sm font-bold font-sans">
              <CheckCircle2 className="w-4 h-4" />
              Parcel Collected & Funds Released
            </div>
            <div className="bg-[#f4efe8] rounded-xl p-5">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans mb-1">
                AMOUNT PAID
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-sm font-bold text-slate-500 font-sans">ZMW</span>
                <span className="text-3xl font-bold text-brand-dark font-serif">
                  {Number(paidQuote.price || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Paid on {new Date(paidQuote.updatedAt).toLocaleDateString()} · via Mobile Money
              </p>
            </div>

            {/* Rate-the-shop — only once the order actually reached the
                buyer (DELIVERED/COMPLETED), and only where the order list
                provides the handler. */}
            {onRate &&
              ['DELIVERED', 'COMPLETED'].includes(String(paidQuote.status || '')) &&
              (alreadyRated ? (
                <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400 font-sans px-1">
                  <Star className="w-4 h-4 text-[#C9973A] fill-[#C9973A]" />
                  You rated this shop
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate();
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#e8dcc4] bg-[#fdf6e9] text-[#8a6118] text-[12px] font-bold font-sans flex items-center justify-center gap-1.5 hover:border-[#d49b35] transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Rate this shop
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
        {/* Meta cluster — allowed to shrink/truncate so it never squeezes the
            action button into a wrapped two-line box on narrow cards. */}
        <div className="flex items-center gap-2 min-w-0">
          {state === 'quoted' ? (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[13px] font-bold text-blue-700 font-sans whitespace-nowrap">
                {quoteCount} {isLoan ? (quoteCount === 1 ? 'Offer' : 'Offers') : 'Quotes'} Received
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-medium text-slate-400 font-sans flex items-center gap-1.5 min-w-0">
              {state === 'open' && (
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(inquiry.createdAt).toLocaleDateString()}
                </span>
              )}
              <span className="uppercase tracking-wider shrink-0">
                IQR-{String(inquiry.id).substring(0, 3)}
              </span>
              {state === 'paid' && paidQuote && (
                <span className="uppercase tracking-wider shrink-0">
                  · QID-{String(paidQuote.id).substring(0, 3)}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 font-sans shrink-0">
            <Eye className="w-3.5 h-3.5" />
            {isLoan
              ? `${views} ${views === 1 ? 'lender' : 'lenders'} viewed`
              : views}
          </div>
        </div>

        {/* `Button` defaults to variant='primary' (text-white / bg /
            shadow); each conflicting utility is marked `!important` so
            InquiryCard's colour intent wins deterministically.
            `whitespace-nowrap shrink-0` keeps the label on one line
            instead of wrapping into a tall box on narrow cards. */}
        <Button
          onClick={onAction}
          className={
            state === 'quoted'
              ? '!bg-[#1B3068] hover:!bg-[#142550] !text-white !shadow-none font-semibold rounded-xl px-4 py-2 text-[12px] whitespace-nowrap shrink-0'
              : '!bg-white border border-slate-200 hover:!bg-slate-50 !text-slate-700 !shadow-none font-semibold rounded-xl px-4 py-2 text-[12px] whitespace-nowrap shrink-0'
          }
        >
          {state === 'open' && 'View Details'}
          {state === 'quoted' && (isLoan ? 'View Offers →' : 'View Quotes →')}
          {state === 'paid' && 'View Receipt'}
        </Button>
      </div>
    </div>
  );
}

interface UrgencyStripProps {
  maxQuotes?: number;
  quoteCount?: number;
  /** Overflow quotes already captured in the hidden reserve pool. When the
   *  primary slots are full but the reserve isn't, the strip reads
   *  "Reserve N / Y" (emerald) instead of a dead-end rose "Slots full" —
   *  providers can still quote into reserve. */
  reserveCount?: number;
  responseDeadlineAt?: string;
}

/**
 * Compact "X / Y slots · Closes in 12m" strip on open leads. Two
 * tone-colored chips so the provider can read urgency at a glance:
 *   slots full, reserve open → emerald "Reserve N / Y"
 *   slots + reserve full     → rose
 *   < 3 slots                → amber
 *   plenty left              → slate
 *   deadline <30m            → amber pulse
 *   deadline past            → rose
 */
function UrgencyStrip({ maxQuotes, quoteCount, reserveCount, responseDeadlineAt }: UrgencyStripProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!responseDeadlineAt) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [responseDeadlineAt]);

  const taken = quoteCount ?? 0;
  const total = maxQuotes ?? 0;
  const remaining = Math.max(0, total - taken);
  const slotsFull = total > 0 && remaining === 0;
  const slotsLow = total > 0 && remaining > 0 && remaining <= 2;
  // Primary full but the overflow reserve (capacity = maxQuotes) isn't:
  // providers can still quote — into reserve.
  const reserveTaken = reserveCount ?? 0;
  const reserveOpen = slotsFull && total > 0 && reserveTaken < total;

  let deadlineLabel = '';
  let deadlineUrgent = false;
  let deadlineExpired = false;
  if (responseDeadlineAt) {
    const ms = new Date(responseDeadlineAt).getTime() - Date.now();
    if (ms <= 0) {
      deadlineLabel = 'Closed';
      deadlineExpired = true;
    } else {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      deadlineLabel =
        h > 0 ? `${h}h ${m}m`
        : m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s`
        : `${s}s`;
      deadlineUrgent = ms < 30 * 60 * 1000;
    }
  }

  const slotClass = reserveOpen
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : slotsFull
      ? 'bg-rose-50 text-rose-600 border border-rose-200'
      : slotsLow
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-slate-50 text-slate-600 border border-slate-200';
  const deadlineClass = deadlineExpired
    ? 'bg-rose-50 text-rose-600 border border-rose-200'
    : deadlineUrgent
      ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
      : 'bg-slate-50 text-slate-600 border border-slate-200';

  return (
    <div className="flex items-center gap-2 mb-4">
      {total > 0 && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${slotClass}`}>
          <Users className="w-3 h-3" />
          {reserveOpen
            ? `Reserve ${reserveTaken} / ${total}`
            : slotsFull
              ? 'Slots full'
              : `${remaining} / ${total} slots`}
        </div>
      )}
      {deadlineLabel && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${deadlineClass}`}>
          <Clock className="w-3 h-3" />
          {deadlineExpired ? 'Closed' : `Respond in ${deadlineLabel}`}
        </div>
      )}
    </div>
  );
}
