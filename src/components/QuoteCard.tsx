import React from 'react';
import { motion } from 'motion/react';
import {
  Star,
  PackageOpen,
  Calendar,
  MessageSquare,
  ArrowRight,
  Printer,
  Archive,
  Check,
} from 'lucide-react';
import { Quote } from '../types';

interface QuoteCardProps {
  quote: Quote;
  onView: () => void;
  onPrint?: () => void;
  onArchive?: () => void;
}

export default function QuoteCard({ quote, onView, onPrint, onArchive }: QuoteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative hover:shadow-md hover:border-[#C9973A]/30 transition-all duration-300 flex flex-col gap-4"
    >
      {/* Unread Indicator */}
      {!quote.isRead && (
        <div className="absolute top-6 left-0 w-1.5 h-8 bg-[#C9973A] rounded-r-full"></div>
      )}

      {/* Header: Shop Info & Price */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg shadow-inner shrink-0">
            {(quote.providerName || 'P').charAt(0)}
          </div>
          <div>
            <h4 className="text-base font-bold text-[#1a1612] leading-tight">
              {quote.providerName || 'Provider'}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-0.5 bg-[#fdf6e9] px-1.5 py-0.5 rounded text-[#C9973A]">
                <Star className="w-3 h-3" fill="currentColor" />
                <span className="text-[10px] font-bold">4.9</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">(120 reviews)</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Total Quote
          </p>
          <div className="flex items-start justify-end">
            <span className="text-sm font-bold text-slate-400 mt-1 mr-0.5">k</span>
            <span className="text-2xl font-black text-[#1a1612] tracking-tight leading-none">
              {(quote.price || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-linear-to-r from-slate-100 via-slate-100 to-transparent"></div>

      {/* Offer Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 bg-[#C9973A]/10 rounded-lg text-[#C9973A]">
            <PackageOpen className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Condition
            </p>
            <p className="text-xs font-bold text-[#1a1612]">{quote.condition}</p>
          </div>
        </div>

        {quote.expiryDuration && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1.5 bg-rose-50 rounded-lg text-rose-500">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                Expires In
              </p>
              <p className="text-xs font-bold text-rose-600">{quote.expiryDuration}</p>
            </div>
          </div>
        )}
      </div>

      {/* Seller Message */}
      {quote.message && (
        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C9973A]/30"></div>
          <div className="flex gap-2.5">
            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 italic leading-relaxed">"{quote.message}"</p>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {(quote.status === 'PAID' || quote.status === 'COMPLETED') && (
        <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-2 text-emerald-700 border border-emerald-100">
          <Check className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {quote.status === 'PAID'
              ? 'Paid - Awaiting Collection'
              : 'Collection Confirmed - Funds Released'}
          </span>
        </div>
      )}

      {/* Footer: Meta & Actions */}
      <div className="flex justify-between items-center pt-1 mt-1">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
          QID-{quote.id}
        </div>

        <div className="flex items-center gap-2">
          {onPrint && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
              className="p-2.5 text-slate-400 hover:text-[#C9973A] hover:bg-[#C9973A]/10 rounded-xl transition-all"
              title="Print Quotation"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          {onArchive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="Archive Quote"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onView}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              !quote.isRead
                ? 'bg-[#1a1612] text-white hover:bg-black shadow-md hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            View Offer
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
