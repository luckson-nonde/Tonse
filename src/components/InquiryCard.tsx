import React from 'react';
import { MapPin, Clock, CheckCircle2 } from 'lucide-react';
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
  console.log('InquiryCard rendering, inquiry:', inquiry);
  const schema = getCategorySchema(inquiry.category);
  const archetypeConfig = ARCHETYPE_CONFIG[inquiry.category] || {
    archetype: 'PRODUCT',
    categoryName: inquiry.category,
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

        <div className="flex items-center text-slate-500 text-sm font-sans mb-6">
          <MapPin className="w-4 h-4 mr-1" />
          Lusaka, Lusaka
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d49b35]"></div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-sans">
            {archetypeConfig.archetype} SCHEMA · {inquiry.category.replace(/-/g, ' ')} ARCHETYPE
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
        </div>

        <Button
          onClick={onAction}
          className={
            state === 'quoted'
              ? 'bg-[#1B3068] hover:bg-[#142550] text-white font-bold rounded-xl'
              : 'bg-transparent border border-slate-200 hover:bg-slate-50 font-bold rounded-xl text-brand-dark'
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
