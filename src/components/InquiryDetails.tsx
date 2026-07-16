import React from 'react';
import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import {
  Calendar,
  MapPin,
  Tag,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  FileText,
  Zap,
  Eye,
  ThumbsUp,
} from 'lucide-react';
import { Inquiry, Quote } from '../types';
import { INQUIRY_STATUS_SCHEMA } from '../services/buyerAccountSchema';
import Button from '../components/Button';
import { isLoanContext } from '../utils/loan';
import SecureFile, { isSecureFileUrl } from './SecureFile';

interface InquiryDetailsProps {
  inquiry: Inquiry;
  quotes: Quote[];
  onAction: (actionId: string, payload?: any) => void;
}

export default function InquiryDetails({ inquiry, quotes, onAction }: InquiryDetailsProps) {
  const statusInfo =
    INQUIRY_STATUS_SCHEMA.states[inquiry.status] || INQUIRY_STATUS_SCHEMA.states['PENDING'];

  // Loan requests read in lending terminology (offers/lenders).
  const isLoan = isLoanContext(
    (inquiry as any).category,
    (inquiry as any).categoryIds,
    inquiry.title,
  );

  // Attributes are now normalized at the service layer
  const parsedAttributes = inquiry.attributes || {};

  // Calculate inquiry age in days
  const inquiryDate = new Date(inquiry.createdAt);
  const daysOld = Math.floor((Date.now() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-8">
      {/* Enhanced Status Banner with Timeline */}
      <div
        className="p-8 rounded-4xl border-2 overflow-hidden relative"
        style={{ backgroundColor: `${statusInfo.color}08`, borderColor: statusInfo.color }}
      >
        {/* Background gradient accent */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ backgroundColor: statusInfo.color }}
        />

        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 flex-1">
            {/* Status Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ backgroundColor: statusInfo.color }}
            >
              {React.createElement((LucideIcons as any)[statusInfo.icon], {
                className: 'w-10 h-10',
              })}
            </motion.div>

            {/* Status Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-bold" style={{ color: statusInfo.color }}>
                  {statusInfo.label}
                </h3>
                {daysOld > 7 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Pending {daysOld} days
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 font-semibold">
                Inquiry ID:{' '}
                <span className="font-mono font-bold text-slate-700">
                  {inquiry.displayId ||
                    `QID-${inquiry.id?.toString().substring(0, 6).toUpperCase()}`}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Posted {inquiryDate.toLocaleDateString()} at {inquiryDate.toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            {statusInfo.nextActions.map((action) => (
              <Button
                key={action}
                onClick={() => onAction(action.toLowerCase(), inquiry)}
                className={`px-6 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  action === 'VIEW_QUOTES'
                    ? 'text-white border-none shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'border-2 text-white hover:bg-slate-50 hover:shadow-md'
                }`}
                style={
                  action === 'VIEW_QUOTES'
                    ? { backgroundColor: statusInfo.color }
                    : { backgroundColor: statusInfo.color, borderColor: statusInfo.color }
                }
              >
                {action === 'VIEW_QUOTES' && quotes.length > 0 && (
                  <Eye className="w-3 h-3 mr-1 inline" />
                )}
                {action.replace('_', ' ')}
              </Button>
            ))}
            <Button
              variant="danger"
              onClick={() => onAction('delete_inquiry', inquiry)}
              className="px-4 py-3 text-xs font-bold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-200 hover:border-rose-300 rounded-xl transition-all"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Buyer Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-linear-to-br from-white to-slate-50 p-8 rounded-4xl border-2 border-slate-100 shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#C9973A]/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#C9973A]" />
              </div>
              Buyer Profile
            </h2>
            {/* Buyer profile. `buyerName` is hydrated server-side by
                `InquiriesService.hydrateBuyerInfo` (joins users on
                buyerId). When still missing — e.g. legacy inquiries
                or a backend that hasn't been restarted yet — fall back
                to a short ID-derived label rather than the meaningless
                "Unknown Buyer" string. The display ID is stable and
                searchable; "Unknown" is just confusing. */}
            <div className="flex items-center gap-6 bg-slate-100/50 p-8 rounded-3xl border border-slate-200">
              <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-[#C9973A] to-[#9d7328] flex items-center justify-center text-white text-4xl font-bold shadow-lg shrink-0">
                {inquiry.buyerName?.charAt(0).toUpperCase() ||
                  String(inquiry.buyerId || 'B').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Buyer Name
                </p>
                <p className="text-2xl font-bold text-slate-900 mb-3 break-words">
                  {inquiry.buyerName ||
                    (inquiry.buyerId
                      ? `Buyer #${String(inquiry.buyerId).slice(0, 8)}`
                      : 'Buyer')}
                </p>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  {inquiry.buyerId && (
                    <span className="text-xs text-slate-500 font-medium break-all">
                      <span className="text-slate-700 font-bold">ID:</span> #
                      {String(inquiry.buyerId).slice(0, 8)}
                    </span>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" /> Verified Buyer
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Inquiry Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-linear-to-br from-slate-50 to-white p-8 rounded-4xl border-2 border-[#C9973A]/20 shadow-md"
          >
            {/* Title and Category */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="text-3xl lg:text-4xl font-serif font-black text-slate-900 leading-tight flex-1">
                  {inquiry.title}
                </h2>
                <span className="px-4 py-2 rounded-full text-xs font-bold bg-[#C9973A]/10 text-[#C9973A] whitespace-nowrap">
                  {inquiry.category?.replace(/-/g, ' ').toUpperCase()}
                </span>
              </div>
              {/* Filter the legacy "No description provided." sentinel
                  (BuyerDashboard used to write this string into every
                  inquiry's description column before the form-derivation
                  fix). New inquiries either have real text or an empty
                  string, so a falsy check + sentinel comparison covers
                  both eras. */}
              {inquiry.description &&
                inquiry.description.trim() !== 'No description provided.' && (
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {inquiry.description}
                  </p>
                )}
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t-2 border-[#C9973A]/10">
              <div className="flex flex-col items-start gap-2">
                <div className="p-3 bg-[#C9973A]/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-[#C9973A]" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Location
                </p>
                <p className="text-sm font-bold text-slate-900">{inquiry.location}</p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <div className="p-3 bg-[#C9973A]/10 rounded-xl">
                  <Calendar className="w-5 h-5 text-[#C9973A]" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Created
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {inquiryDate.toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isLoan ? 'Lenders Viewed' : 'Views'}
                </p>
                {/* Real viewCount from the inquiry, not a randomised
                    placeholder. The previous `Math.random()` here meant
                    every render mutated the displayed number — visible
                    to anyone re-opening the same inquiry. */}
                <p className="text-sm font-bold text-slate-900">
                  {inquiry.viewCount ?? 0}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <ThumbsUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Status Age
                </p>
                <p className="text-sm font-bold text-slate-900">{daysOld}d ago</p>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Specifications Section */}
          {parsedAttributes && Object.keys(parsedAttributes).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white p-8 rounded-4xl border-2 border-slate-100 shadow-md"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C9973A]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#C9973A]" />
                </div>
                Specifications & Details
              </h3>
              <div className="space-y-4">
                {Object.entries(parsedAttributes).map(([key, value]) => {
                  // Skip empty strings and whitespace-only strings
                  if (typeof value === 'string' && !value.trim()) {
                    return null;
                  }

                  // Secure (encrypted, auth-gated) documents — render via the
                  // authenticated loader, never a public <img>.
                  const secureVals = (Array.isArray(value) ? value : [value]).filter(isSecureFileUrl);
                  if (secureVals.length > 0) {
                    return (
                      <div key={key}>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#C9973A]" />
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <div className="flex flex-wrap gap-4">
                          {secureVals.map((u, i) => (
                            <SecureFile
                              key={i}
                              url={u}
                              className="w-40 h-40 object-cover rounded-2xl border-2 border-slate-200"
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Match image files by EXTENSION, not protocol — uploads are
                  // stored as relative paths ("/api/uploads/…jpg"), so an
                  // http-only test dropped them to raw text.
                  const looksLikeImage = (u: string) =>
                    /\.(jpe?g|png|gif|webp)(\?|$)/i.test(u.trim());
                  let imageUrls: string[] = [];
                  if (Array.isArray(value)) {
                    imageUrls = value.filter(
                      (url) => typeof url === 'string' && looksLikeImage(url),
                    );
                  } else if (typeof value === 'string') {
                    const parts = value.includes(',')
                      ? value.split(',').map((u) => u.trim())
                      : [value.trim()];
                    imageUrls = parts.filter(looksLikeImage);
                  }

                  if (imageUrls.length > 0) {
                    return (
                      <div key={key}>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#C9973A]" />
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          {imageUrls.map((url, idx) => (
                            <motion.div
                              key={`${url}-${idx}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-slate-50 hover:shadow-lg hover:border-[#C9973A]/50 transition-all cursor-pointer group"
                            >
                              <img
                                src={url}
                                alt={`${key} ${idx}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Skip empty objects or non-meaningful values
                  if (typeof value === 'object' && value !== null) {
                    // Skip if empty object or array
                    if (
                      (Array.isArray(value) && value.length === 0) ||
                      (!Array.isArray(value) && Object.keys(value).length === 0)
                    ) {
                      return null;
                    }
                  }

                  // For non-image values, display with enhanced styling.
                  // Long text values (incident reports, symptoms,
                  // additional details) used to overflow the panel
                  // horizontally because the row was a `flex justify-
                  // between` with `shrink-0` on the value — labels stayed
                  // left, values pushed off the right edge of the card.
                  // Now: short scalars keep the side-by-side layout;
                  // long strings flip to stacked label-above-value with
                  // `break-words` so the value wraps inside the panel.
                  const valueText =
                    typeof value === 'object' ? JSON.stringify(value) : String(value);
                  const isLongText = valueText.length > 40;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 bg-linear-to-r from-slate-50/50 to-transparent rounded-2xl border border-slate-100/50 hover:border-[#C9973A]/30 transition-all group ${
                        isLongText ? 'flex flex-col gap-2' : 'flex justify-between items-center'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 shrink-0">
                        <Tag className="w-3 h-3 text-slate-300 group-hover:text-[#C9973A]" />
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span
                        className={`text-sm font-bold text-slate-900 ${
                          isLongText
                            ? 'leading-relaxed break-words'
                            : 'ml-4 shrink-0 text-right'
                        }`}
                      >
                        {valueText}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar: Quotes Summary & Support */}
        <div className="space-y-6">
          {/* Enhanced Quotes Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white p-8 rounded-4xl border-2 border-slate-100 shadow-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                {isLoan ? 'Offers Received' : 'Quotes Received'}
              </h3>
              {quotes.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  {quotes.length}
                </span>
              )}
            </div>

            {quotes.length > 0 ? (
              <div className="space-y-3">
                {quotes.slice(0, 5).map((quote, idx) => (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onAction('view_quote', quote)}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {quote.providerName}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {isLoan ? 'Loan Offer' : quote.condition}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors mt-1" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400 font-medium">{isLoan ? 'Approved' : 'Amount'}</span>
                      <span className="text-lg font-black text-blue-600">
                        {isLoan ? 'ZMW ' : 'K'}{Number(quote.price || 0).toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {quotes.length > 5 && (
                  <button className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors mt-2">
                    View All {quotes.length} Quotes →
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-2">
                  {isLoan ? 'Awaiting Lender Offers' : 'Awaiting Provider Responses'}
                </p>
                {/* The previous copy claimed "shared with N providers"
                    where N was a randomised number — pure noise. The
                    inquiry response doesn't carry a match-count, so
                    don't fabricate one. Generic encouraging copy
                    instead. */}
                <p className="text-xs text-slate-500 px-4">
                  {isLoan
                    ? 'Licensed lenders will review your request and send offers shortly.'
                    : 'Matched providers will respond shortly.'}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Inquiry Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="bg-linear-to-br from-slate-50 to-white p-6 rounded-4xl border-2 border-slate-100 shadow-md"
          >
            <h4 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Quick Stats
            </h4>
            {/* Quick Stats — every value is sourced from real inquiry
                fields. The previous "Engagement %" was a randomised
                fake metric and the previous "Views" was also random;
                both removed in favour of values that actually mean
                something (active duration, real view count, quotes
                received). */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-medium text-slate-600">Active Duration</span>
                <span className="text-sm font-bold text-slate-900">
                  {daysOld === 0 ? 'Today' : `${daysOld} day${daysOld === 1 ? '' : 's'}`}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-medium text-slate-600">Views</span>
                <span className="text-sm font-bold text-slate-900">
                  {inquiry.viewCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-medium text-slate-600">{isLoan ? 'Offers Received' : 'Quotes Received'}</span>
                <span className="text-sm font-bold text-slate-900">{quotes.length}</span>
              </div>
            </div>
          </motion.div>

          {/* Support Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-linear-to-br from-slate-900 to-slate-800 p-6 rounded-4xl text-white shadow-lg"
          >
            <h4 className="font-serif font-bold text-lg mb-2">Need Assistance?</h4>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Our dedicated support team is here to help optimize your inquiry and connect you with
              the right providers.
            </p>
            <Button
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10 font-bold rounded-xl transition-all"
            >
              Contact Support
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
