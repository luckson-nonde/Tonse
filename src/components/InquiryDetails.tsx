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
} from 'lucide-react';
import { Inquiry, Quote } from '../types';
import { INQUIRY_STATUS_SCHEMA } from '../services/buyerAccountSchema';
import Button from '../components/Button';

interface InquiryDetailsProps {
  inquiry: Inquiry;
  quotes: Quote[];
  onAction: (actionId: string, payload?: any) => void;
}

export default function InquiryDetails({ inquiry, quotes, onAction }: InquiryDetailsProps) {
  console.log('InquiryDetails rendering, inquiry:', inquiry);
  const statusInfo =
    INQUIRY_STATUS_SCHEMA.states[inquiry.status] || INQUIRY_STATUS_SCHEMA.states['PENDING'];

  // Parse attributes if it's a JSON string
  let parsedAttributes: Record<string, any> = {};
  if (inquiry.attributes) {
    if (typeof inquiry.attributes === 'string') {
      try {
        parsedAttributes = JSON.parse(inquiry.attributes);
      } catch {
        parsedAttributes = {};
      }
    } else {
      parsedAttributes = inquiry.attributes;
    }
  }

  return (
    <div className="space-y-8">
      {/* Status Banner */}
      <div
        className="p-6 rounded-4xl flex items-center justify-between gap-4 border"
        style={{ backgroundColor: `${statusInfo.color}10`, borderColor: `${statusInfo.color}30` }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
            style={{ backgroundColor: statusInfo.color }}
          >
            {React.createElement((LucideIcons as any)[statusInfo.icon], { className: 'w-6 h-6' })}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{statusInfo.label}</h3>
            <p className="text-sm text-slate-500">Inquiry ID: QID-{inquiry.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={() => onAction('delete_inquiry', inquiry)}
            className="px-6 py-2.5 text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 border-none"
          >
            Delete Inquiry
          </Button>
          {statusInfo.nextActions.map((action) => (
            <Button
              key={action}
              variant={action === 'VIEW_QUOTES' ? 'primary' : 'outline'}
              onClick={() => onAction(action.toLowerCase(), inquiry)}
              className="px-6 py-2.5 text-xs font-bold"
            >
              {action.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Buyer Information */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#C9973A]" />
              Buyer Information
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-brand-gold to-[#9d7328] flex items-center justify-center text-white text-2xl font-bold">
                {inquiry.buyerName?.charAt(0).toUpperCase() || 'B'}
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Buyer Name</p>
                <p className="text-lg font-bold text-slate-800">
                  {inquiry.buyerName || 'Unknown Buyer'}
                </p>
                <p className="text-xs text-slate-400 mt-2">ID: #{inquiry.buyerId}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-serif font-black text-slate-800 mb-4">{inquiry.title}</h2>
            <p className="text-slate-600 leading-relaxed mb-8">{inquiry.description}</p>

            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Location
                  </p>
                  <p className="text-sm font-bold text-slate-800">{inquiry.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Created On
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attributes */}
          {parsedAttributes && Object.keys(parsedAttributes).length > 0 && (
            <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(parsedAttributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Quotes Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C9973A]" />
              Quotes Received
            </h3>
            <div className="space-y-3">
              {quotes.length > 0 ? (
                quotes.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => onAction('view_quote', quote)}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-[#C9973A]/30 hover:bg-slate-50 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-800">{quote.providerName}</span>
                      <span className="text-sm font-black text-[#C9973A]">
                        K{quote.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {quote.condition}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#C9973A] transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-medium">
                    Waiting for providers to respond...
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-4xl text-white">
            <h4 className="font-serif font-bold text-lg mb-2">Need Help?</h4>
            <p className="text-slate-400 text-sm mb-6">
              Our support team is available 24/7 to assist with your inquiries.
            </p>
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
