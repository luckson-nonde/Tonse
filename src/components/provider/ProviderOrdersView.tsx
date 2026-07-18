import React from 'react';
import { Clock, Check, FileText, QrCode } from 'lucide-react';
import { Inquiry } from '../../types';
import { hasPermission, PERMISSIONS } from '../../utils/rbac';
import { uniqueKey } from '../../utils/keyUtils';
import emptyOrdersImage from '../../assets/images/empty-states/owl_reading.webp';
import { getEffectiveBusinessTypes } from '../../services/categories';
import { useActiveProfileContext } from '../../hooks/useActiveProfileContext';

interface ProviderOrdersViewProps {
  user: any;
  displayQuotes: any[];
  isBookingBased: boolean;
  onSetActiveChecklistQuote: (quote: any) => void;
  onStartScan: (id: number) => void;
}

export default function ProviderOrdersView({
  user,
  displayQuotes,
  isBookingBased,
  onSetActiveChecklistQuote,
  onStartScan,
}: ProviderOrdersViewProps) {
  // Persona-aware: a RETAIL+WHOLESALE seller in RETAIL persona sees
  // "Paid Orders" not "Purchase Orders". Wholesale labels only fire
  // when the active mode is WHOLESALE.
  const { context: activeContext } = useActiveProfileContext();
  const isWholesale = getEffectiveBusinessTypes(user as any, activeContext).includes('WHOLESALE');
  const filteredQuotes = displayQuotes.filter(
    (q) => q.status === 'PAID' || q.status === 'AWAITING_PICKUP'
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl font-serif font-bold text-slate-900 px-0 sm:px-0">
        {isWholesale ? 'Purchase Orders (Active)' : isBookingBased ? 'Paid Bookings' : 'Paid Orders (Escrow)'}
      </h2>
      <div className="space-y-4 sm:space-y-6">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[50vh] shadow-sm">
            <img src={emptyOrdersImage} alt="No paid orders" className="w-48 h-48 sm:w-56 sm:h-56 object-contain opacity-90 mb-8" />
            <p className="text-slate-500 font-medium text-lg">No paid orders awaiting collection.</p>
          </div>
        ) : (
          filteredQuotes.map((quote, idx) => {
            const lead = (quote as any).inquiry as Inquiry;
            if (!lead) return null;

            const isAwaitingPickup = quote.status === 'AWAITING_PICKUP';

            return (
              <div
                key={uniqueKey('paid-tab-quote', quote.id, idx)}
                className="bg-white rounded-2xl sm:rounded-4xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div
                  className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between ${isAwaitingPickup ? 'bg-brand-white' : 'bg-emerald-50/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border ${isAwaitingPickup ? 'bg-[#fdf6e9] text-[#d49b35] border-[#d49b35]/20' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}
                    >
                      <img
                        src={`https://picsum.photos/seed/${lead.buyerId}/100/100`}
                        alt={lead.buyerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {lead.buyerName}
                      </h3>
                      <p
                        className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${isAwaitingPickup ? 'text-[#d49b35]' : 'text-emerald-600'}`}
                      >
                        {isAwaitingPickup ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        {isAwaitingPickup ? 'Awaiting Pickup' : 'Paid - Awaiting Collection'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {(hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) ||
                      hasPermission(user, PERMISSIONS.MANAGE_QUOTES)) && (
                      <p
                        className={`text-xl font-black ${isAwaitingPickup ? 'text-[#d49b35]' : 'text-emerald-600'}`}
                      >
                        ZMW {quote.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-2">{lead.title}</h4>
                  <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Buyer Contact
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {quote.buyerContact?.name || lead.buyerName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {quote.buyerContact?.phone || 'No phone provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Location
                        </p>
                        <p className="text-sm font-bold text-slate-900">{lead.location}</p>
                      </div>
                    </div>
                  </div>

                  {isAwaitingPickup ? (
                    <button
                      onClick={() => onSetActiveChecklistQuote(quote)}
                      className="w-full py-4 bg-brand-dark text-white font-bold rounded-2xl hover:bg-brand-navy-dark transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      {isWholesale ? 'Finalize Supply Handover' : 'Complete Pickup Checklist'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartScan(quote.id!)}
                      className="w-full py-4 bg-[#C9973A] text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-[#C9973A]/20 flex items-center justify-center gap-2 duration-300"
                    >
                      <QrCode className="w-5 h-5" />
                      {isWholesale ? 'Verify Fulfillment' : 'Scan to Collect'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
