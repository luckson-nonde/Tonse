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
  ChevronLeft,
  MapPin,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { Quote, Inquiry } from '../types';
import Button from '../components/Button';

interface QuoteDetailsProps {
  quote: Quote;
  inquiry?: Inquiry;
  onAction: (actionId: string, payload?: any) => void;
}

export default function QuoteDetails({ quote, inquiry, onAction }: QuoteDetailsProps) {
  return (
    <div className="space-y-8">
      {/* Provider Header */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[28px] bg-[#fffaf5] border border-[#C9973A]/10 flex items-center justify-center text-[#C9973A] font-serif font-black text-3xl shadow-inner">
            {(quote.providerName || 'P').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-serif font-black text-[#1e293b]">{quote.providerName}</h2>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[#C9973A]">
                <Star className="w-4 h-4 fill-currentColor" />
                <span className="text-sm font-bold">4.9</span>
                <span className="text-xs text-slate-400 font-medium">(120 reviews)</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Lusaka, Zambia</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Total Offer</p>
          <h3 className="text-4xl font-black text-[#1e293b] tracking-tighter">
            <span className="text-lg font-bold text-slate-300 mr-1">K</span>
            {quote.price.toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Message & Terms */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-[#1e293b] mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#C9973A]" />
              Provider Message
            </h3>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 leading-relaxed mb-8">
              "{quote.message}"
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-slate-100 bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[#fffaf5] rounded-xl text-[#C9973A]">
                    <PackageOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Condition</span>
                </div>
                <p className="text-lg font-bold text-[#1e293b]">{quote.condition}</p>
              </div>
              <div className="p-6 rounded-2xl border border-slate-100 bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Validity</span>
                </div>
                <p className="text-lg font-bold text-rose-600">{quote.expiryDuration || '7 Days'}</p>
              </div>
            </div>
          </div>

          {/* Inquiry Reference */}
          {inquiry && (
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-[#1e293b] mb-4">Inquiry Reference</h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-[#1e293b] mb-2">{inquiry.title}</h4>
                <p className="text-sm text-slate-500 line-clamp-2">{inquiry.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-6">
          {/* Process-Aware Action Bar */}
          <div className="bg-[#1e293b] p-8 rounded-[32px] text-white shadow-xl shadow-slate-200">
            <h3 className="text-xl font-serif font-bold mb-4">
              {quote.processType === 'EXPRESS' ? 'Ready to pay?' : 'Ready to proceed?'}
            </h3>
            
            {/* Progress Indicator for Standard */}
            {quote.processType === 'STANDARD' && (
              <div className="mb-6">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>Inquiry</span>
                  <span>PO Pending</span>
                  <span>Payment</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C9973A] w-1/3"></div>
                </div>
              </div>
            )}

            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {quote.processType === 'EXPRESS' 
                ? 'Pay now to start the service immediately.' 
                : 'Generate a Purchase Order to formalize this transaction.'}
            </p>

            {/* Document Section */}
            {quote.dynamicFields?.proformaInvoice && (
              <div className="mb-6">
                <Button 
                  variant="outline"
                  onClick={() => window.open(quote.dynamicFields?.proformaInvoice, '_blank')}
                  className="w-full py-3 border-white/10 text-white hover:bg-white/5 text-xs"
                >
                  View Proforma Invoice
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={() => onAction(quote.processType === 'EXPRESS' ? 'accept_quote' : 'generate_po', quote)}
                className={`w-full py-4 ${quote.processType === 'EXPRESS' ? 'bg-[#C9973A] hover:bg-[#b08432]' : 'bg-white text-[#1e293b] hover:bg-slate-200'} border-none shadow-lg shadow-[#C9973A]/20`}
              >
                {quote.processType === 'EXPRESS' ? 'Pay & Start Service' : 'Generate Purchase Order (PO)'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => onAction('archive_quote', quote)}
                className="w-full py-4 border-white/10 text-white hover:bg-white/5"
              >
                Decline Offer
              </Button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-[#1e293b] mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onAction('print_quote', quote)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
              >
                <Printer className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Print</span>
              </button>
              <button 
                onClick={() => onAction('share_quote', quote)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
              >
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
