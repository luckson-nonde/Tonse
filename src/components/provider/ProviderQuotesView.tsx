import React from 'react';
import {
  MapPin,
  Eye,
  PackageOpen,
  ChevronUp,
  ChevronDown,
  Printer,
  Archive,
} from 'lucide-react';
import { Inquiry } from '../../types';
import emptyQuotesImage from '../../assets/images/empty-states/owl_reading.png';
import { hasPermission, PERMISSIONS } from '../../utils/rbac';
import { uniqueKey } from '../../utils/keyUtils';
import { robustParse } from '../../utils/jsonUtils';

interface ProviderQuotesViewProps {
  user: any;
  displayQuotes: any[];
  quoteSort: 'recent' | 'expensive';
  expandedInquiryId: number | null;
  onSetQuoteSort: (sort: 'recent' | 'expensive') => void;
  onToggleExpand: (id: number) => void;
  onPrintQuote: (quote: any, lead: any) => void;
  onArchiveQuote: (id: number) => void;
  renderSpecifications: (data: any, category: string, title: string) => React.ReactNode;
}

export default function ProviderQuotesView({
  user,
  displayQuotes,
  quoteSort,
  expandedInquiryId,
  onSetQuoteSort,
  onToggleExpand,
  onPrintQuote,
  onArchiveQuote,
  renderSpecifications,
}: ProviderQuotesViewProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center px-0 sm:px-0">
        <h2 className="text-2xl font-serif font-bold text-slate-900">
          {user?.subRole === 'SUPPLIER_SELLER' ? 'Active Quotations' : 'My Submitted Quotes'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSetQuoteSort('recent')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${quoteSort === 'recent' ? 'bg-[#d49b35] text-white border-[#d49b35]' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            Recent
          </button>
          <button
            onClick={() => onSetQuoteSort('expensive')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${quoteSort === 'expensive' ? 'bg-[#d49b35] text-white border-[#d49b35]' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            Price
          </button>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {displayQuotes.filter((q) => q.status !== 'ARCHIVED').length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[50vh] shadow-sm">
            <img src={emptyQuotesImage} alt="No active quotes" className="w-48 h-48 sm:w-56 sm:h-56 object-contain opacity-90 mb-8" />
            <p className="text-slate-500 font-medium text-lg">No active quotes submitted yet.</p>
          </div>
        ) : (
          [...displayQuotes]
            .filter((q) => q.status !== 'ARCHIVED')
            .sort((a, b) =>
              quoteSort === 'recent' ? b.createdAt - a.createdAt : b.price - a.price
            )
            .map((quote, idx) => {
              const lead = (quote as any).inquiry as Inquiry;
              if (!lead) return null;
              const isExpanded = expandedInquiryId === lead.id;

              return (
                <div
                  key={uniqueKey('quotes-tab-quote', quote.id, idx)}
                  className="bg-white rounded-2xl sm:rounded-4xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#fdf6e9] flex items-center justify-center text-[#d49b35] font-bold text-sm overflow-hidden border border-[#d49b35]/20">
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
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Quote Submitted
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[11px] text-slate-400 font-bold">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {lead.location}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <h4 className="text-lg font-serif font-bold text-slate-900 wrap-break-word">
                      {lead.title}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2 wrap-break-word whitespace-pre-wrap">
                      {lead.description}
                    </p>

                    <div className="mt-6 p-4 bg-[#fdf6e9]/50 rounded-2xl border border-[#d49b35]/10">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Your Price
                          </p>
                          {hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) ||
                          hasPermission(user, PERMISSIONS.MANAGE_QUOTES) ? (
                            <p className="text-sm font-black text-[#d49b35]">
                              ZMW {quote.price.toLocaleString()}
                              {(() => {
                                const dynamicFields = robustParse(quote.dynamicFields);
                                const unit = dynamicFields.rateUnit || quote.rateUnit;
                                if (unit) return <span className="text-[10px] font-bold text-slate-400 ml-1">/ {unit.replace('Per ', '')}</span>;
                                return null;
                              })()}
                            </p>
                          ) : (
                            <p className="text-[10px] font-black text-[#d49b35]">Price Hidden</p>
                          )}
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                            quote.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : quote.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : 'bg-[#fdf6e9] text-[#d49b35] border border-[#d49b35]/20'
                          }`}
                        >
                          {quote.status}
                        </div>
                      </div>

                      {/* Professional Offer Details Grid */}
                      {(() => {
                        const dynamicFields = robustParse(quote.dynamicFields);
                        const details = [];

                        if (dynamicFields.securityDeposit || quote.securityDeposit) {
                          details.push({ label: 'Sec. Deposit', value: `K${(dynamicFields.securityDeposit || quote.securityDeposit).toLocaleString()}` });
                        }
                        if (dynamicFields.maxCapacity || quote.maxCapacity) {
                          details.push({ label: 'Capacity', value: `${dynamicFields.maxCapacity || quote.maxCapacity} Guests` });
                        }
                        if (dynamicFields.numberOfWorkers || quote.numberOfWorkers) {
                          details.push({ label: 'Workers', value: `${dynamicFields.numberOfWorkers || quote.numberOfWorkers}` });
                        }
                        if (quote.cleaningFee) {
                          details.push({ label: 'Cleaning', value: `K${quote.cleaningFee.toLocaleString()}` });
                        }
                        if (quote.damageDeposit) {
                          details.push({ label: 'Damage Dep.', value: `K${quote.damageDeposit.toLocaleString()}` });
                        }

                        if (details.length === 0 && !quote.venueSpaceName) return null;

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            {quote.venueSpaceName && (
                              <div className="bg-white/60 p-2 rounded-xl border border-[#d49b35]/5">
                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Space</p>
                                <p className="text-[10px] font-bold text-slate-700 truncate">{quote.venueSpaceName}</p>
                              </div>
                            )}
                            {details.map((d, i) => (
                              <div key={i} className="bg-white/60 p-2 rounded-xl border border-[#d49b35]/5">
                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">{d.label}</p>
                                <p className="text-[10px] font-bold text-slate-700">{d.value}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Condition:
                        </span>
                        <span className="text-[10px] font-bold text-[#d49b35] bg-white px-2 py-0.5 rounded border border-[#d49b35]/10 uppercase tracking-wider">
                          {quote.condition}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 italic">"{quote.message}"</p>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 space-y-6 border-t border-slate-100 pt-6">
                        {lead.attributes && (
                          <div className="mb-6">
                            {renderSpecifications(
                              lead.attributes,
                              lead.category || '',
                              'Inquiry Details'
                            )}
                          </div>
                        )}

                        {lead.entertainmentData && (
                          <div className="mb-6">
                            {renderSpecifications(
                              lead.entertainmentData,
                              lead.category || '',
                              'Event Specifications'
                            )}
                          </div>
                        )}

                        {lead.repairData && (
                          <div className="mb-6">
                            {renderSpecifications(
                              lead.repairData,
                              lead.category || '',
                              'Repair Specifications'
                            )}
                          </div>
                        )}

                        {lead.items && lead.items.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Item Breakdown
                              </h5>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Price (ZMW)
                              </span>
                            </div>
                            {lead.items.map((item, itemIdx) => {
                              const itemPrice = quote.itemPrices?.find(
                                (ip: any) => ip.itemId === (item.id || `${lead.id}-item-${itemIdx}`)
                              )?.price;
                              return (
                                <div
                                  key={uniqueKey(
                                    'quote-item-breakdown',
                                    undefined,
                                    `${quote.id || idx}-${itemIdx}`
                                  )}
                                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-200">
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">
                                      {item.title}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-[#d49b35]">
                                      K{itemPrice?.toLocaleString() || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                          <Eye className="w-3.5 h-3.5" /> {lead.viewCount || 0} Views
                        </div>
                        <button
                          onClick={() => onToggleExpand(lead.id!)}
                          className="flex items-center gap-1.5 text-[#d49b35] hover:underline text-[11px] font-bold"
                        >
                          <PackageOpen className="w-3.5 h-3.5" />
                          {lead.items && lead.items.length > 0
                            ? `${lead.items.length} Items`
                            : 'View Details'}
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPrintQuote(quote, lead)}
                          className="p-2 text-slate-400 hover:text-[#d49b35] hover:bg-[#fdf6e9] rounded-xl transition-all"
                          title="Print Quotation"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onArchiveQuote(quote.id!)}
                          className="p-2 text-slate-400 hover:text-[#d49b35] hover:bg-[#fdf6e9] rounded-xl transition-all"
                          title="Archive Quote"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const items = Array.isArray(lead.items)
                        ? lead.items
                        : typeof lead.items === 'string'
                          ? robustParse(lead.items)
                          : [];
                      
                      if (!isExpanded || !items || items.length === 0) return null;

                      return (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                          {items.map((item: any, itemIdx: number) => (
                            <div
                              key={uniqueKey(
                                'quote-item-details',
                                undefined,
                                `${quote.id || idx}-${itemIdx}`
                              )}
                              className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h6 className="font-bold text-slate-900 text-sm">{item.title}</h6>
                                <span className="text-[10px] font-bold text-[#d49b35] bg-[#fdf6e9] px-2 py-0.5 rounded border border-[#d49b35]/10">
                                  Qty: {item.quantity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">{item.description}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
