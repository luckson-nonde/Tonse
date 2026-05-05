import React, { useEffect, useState } from 'react';
import { MapPin, Clock, CheckCircle2, Eye, Users } from 'lucide-react';
import Button from './Button';
import { ARCHETYPE_CONFIG } from '../services/archetypeConfig';
import { getCategorySchema } from '../services/categories';

interface InquiryCardProps {
  inquiry: any;
  state: 'open' | 'quoted' | 'paid';
  quoteCount?: number;
  paidQuote?: any;
  onAction: () => void;
  onDelete: () => void;
}

export default function InquiryCard({
  inquiry,
  state,
  quoteCount = 0,
  paidQuote,
  onAction,
  onDelete,
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
            responseDeadlineAt={inquiry.responseDeadlineAt}
          />
        )}
        {!(state === 'open' && (inquiry.maxQuotes || inquiry.responseDeadlineAt)) && (
          <div className="mb-3" />
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d49b35]"></div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-sans">
            {archetypeConfig.archetype} SCHEMA{categoryKey && ` · ${categoryKey.replace(/-/g, ' ')} ARCHETYPE`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {displayAttributes.map(([key, value]) => {
            const isLongText = typeof value === 'string' && value.length > 30;
            return (
              <div
                key={key}
                className={`bg-[#f4efe8] rounded-xl p-3 ${isLongText ? 'col-span-2' : 'col-span-1'}`}
              >
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans mb-1">
                  {getLabel(key)}
                </p>
                <p className="text-sm text-brand-dark font-medium font-sans">
                  {formatValue(key, value)}
                </p>
              </div>
            );
          })}
        </div>

        {state === 'open' && (
          <div className="bg-[#f4efe8] rounded-xl p-3 flex items-center gap-2 text-slate-500 text-sm font-medium font-sans">
            <Clock className="w-4 h-4" />
            Awaiting responses from suppliers
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
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {state === 'quoted' ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-sm font-bold text-blue-700 font-sans">
                  {quoteCount} Quotes Received
                </span>
              </div>
            ) : (
              <div className="text-xs font-medium text-slate-400 font-sans flex items-center gap-2">
                {state === 'open' && (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </>
                )}
                <span className="uppercase tracking-wider">
                  IQR-{String(inquiry.id).substring(0, 3)}
                </span>
                {state === 'paid' && paidQuote && (
                  <>
                    <span>·</span>
                    <span className="uppercase tracking-wider">
                      QID-{String(paidQuote.id).substring(0, 3)}
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 font-sans">
              <Eye className="w-3.5 h-3.5" />
              {inquiry.viewCount ?? 0}
            </div>
          </div>
        </div>

        {/* `Button` defaults to variant='primary' which sets
            `text-white`. Without `!` important on the InquiryCard's
            text colour, both classes end up on the element and CSS
            source order picks `text-white` — the cause of the
            invisible button text in the original render. The same
            applies to the variant's `bg-brand-yellow` and
            `shadow-md`. Marking each conflicting utility `!important`
            forces InquiryCard's intent to win deterministically. */}
        <Button
          onClick={onAction}
          className={
            state === 'quoted'
              ? '!bg-[#1B3068] hover:!bg-[#142550] !text-white !shadow-none font-semibold rounded-xl px-5 py-2.5 text-[13px]'
              : '!bg-white border border-slate-200 hover:!bg-slate-50 !text-slate-700 !shadow-none font-semibold rounded-xl px-5 py-2.5 text-[13px]'
          }
        >
          {state === 'open' && 'View Details'}
          {state === 'quoted' && 'View Quotes →'}
          {state === 'paid' && 'View Receipt'}
        </Button>
      </div>
    </div>
  );
}

interface UrgencyStripProps {
  maxQuotes?: number;
  quoteCount?: number;
  responseDeadlineAt?: string;
}

/**
 * Compact "X / Y slots · Closes in 12m" strip on open leads. Two
 * tone-colored chips so the provider can read urgency at a glance:
 *   slots full   → rose
 *   < 3 slots    → amber
 *   plenty left  → slate
 *   deadline <30m→ amber pulse
 *   deadline past→ rose
 */
function UrgencyStrip({ maxQuotes, quoteCount, responseDeadlineAt }: UrgencyStripProps) {
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

  const slotClass = slotsFull
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
          {slotsFull ? 'Slots full' : `${remaining} / ${total} slots`}
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
