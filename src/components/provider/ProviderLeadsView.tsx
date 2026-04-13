import React from 'react';
import { 
  PackageOpen, 
  MapPin, 
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Inquiry } from '../../types';
import { getCategorySchema } from '../../services/categories';
import { generateQuoteSchema } from '../../services/quoteSchemaGenerator';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import DynamicDataDisplay from '../DynamicDataDisplay';
import { uniqueKey } from '../../utils/keyUtils';

interface QuoteSubmissionFormProps {
  inquiry: Inquiry;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  venueSpaces: any[];
  user: any;
  itemPricesTotal: number;
}

const QuoteSubmissionForm = ({ inquiry, onSubmit, onCancel, venueSpaces, user, itemPricesTotal }: QuoteSubmissionFormProps) => {
  const { fields: quoteSchema, zodSchema } = React.useMemo(() => 
    generateQuoteSchema(inquiry.category || '', inquiry.attributes || {}, inquiry.processType || 'STANDARD'),
    [inquiry.category, inquiry.attributes, inquiry.processType]
  );

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: {
      condition: 'Brand New',
      optionalDeliveryOffer: false,
      optionalDeliveryFee: 0,
      ...Object.fromEntries(quoteSchema.map(f => [f.name, f.type === 'toggle' ? false : '']))
    }
  });

  const formData = watch();
  
  const calculatedTotal = React.useMemo(() => {
    let total = 0;
    let hasCalculatedFields = false;
    quoteSchema.forEach(field => {
      if (field.calculation === 'unit' && inquiry.attributes?.quantity) {
        total += (Number(formData[field.name]) || 0) * Number(inquiry.attributes.quantity);
        hasCalculatedFields = true;
      }
      if (field.calculation === 'rate' && inquiry.attributes?.rentalDuration) {
        total += (Number(formData[field.name]) || 0) * Number(inquiry.attributes.rentalDuration);
        hasCalculatedFields = true;
      }
    });
    
    if (!hasCalculatedFields) {
        if (itemPricesTotal > 0) {
            total += itemPricesTotal;
        } else if (formData.price) {
            total += Number(formData.price) || 0;
        }
    }
    
    return total;
  }, [formData, quoteSchema, inquiry.attributes, itemPricesTotal]);

  const onFormSubmit = (data: any) => {
    onSubmit({ ...data, calculatedTotal, processType: inquiry.processType });
  };

  return (
    <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h5 className="font-bold text-slate-900">Submit Your Quotation</h5>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${inquiry.processType === 'EXPRESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          Process: {inquiry.processType || 'STANDARD'}
        </span>
      </div>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {quoteSchema.map(field => {
          if (field.name === 'optionalDeliveryFee' && formData.optionalDeliveryOffer !== true) {
            return null;
          }

          return (
            <div key={uniqueKey('quote-field', undefined, field.name)}>
              <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                {field.label}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
              </label>
              
              <Controller
                name={field.name}
                control={control}
                render={({ field: { onChange, value } }) => {
                  if (field.type === 'currency') {
                    return (
                      <div className="relative">
                        <input
                          type="number"
                          value={field.name === 'price' && itemPricesTotal > 0 ? itemPricesTotal : ((value as string | number) || '')}
                          onChange={onChange}
                          readOnly={field.name === 'price' && itemPricesTotal > 0}
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border ${errors[field.name] ? 'border-rose-500' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] ${field.name === 'price' && itemPricesTotal > 0 ? 'bg-slate-100 font-bold text-[#d49b35]' : ''}`}
                          placeholder={field.placeholder || "0.00"}
                        />
                        <span className="absolute left-4 top-3.5 text-sm font-bold text-slate-400">ZMW</span>
                        {field.calculation && inquiry.attributes?.quantity && field.calculation === 'unit' && (
                          <span className="text-[11px] font-medium text-slate-500 mt-1.5 block">
                            × {inquiry.attributes.quantity} units = ZMW {((Number(value) || 0) * Number(inquiry.attributes.quantity)).toLocaleString()}
                          </span>
                        )}
                        {field.calculation && inquiry.attributes?.rentalDuration && field.calculation === 'rate' && (
                          <span className="text-[11px] font-medium text-slate-500 mt-1.5 block">
                            × {inquiry.attributes.rentalDuration} days = ZMW {((Number(value) || 0) * Number(inquiry.attributes.rentalDuration)).toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (field.type === 'number') {
                    return (
                      <input
                        type="number"
                        value={(value as string | number) || ''}
                        onChange={onChange}
                        className={`w-full px-4 py-3 rounded-xl border ${errors[field.name] ? 'border-rose-500' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]`}
                        placeholder={field.placeholder}
                      />
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <textarea
                        value={(value as string) || ''}
                        onChange={onChange}
                        className={`w-full px-4 py-3 rounded-xl border ${errors[field.name] ? 'border-rose-500' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] resize-none`}
                        placeholder={field.placeholder}
                        rows={3}
                      />
                    );
                  }

                  if (field.type === 'select' && field.options) {
                    return (
                      <select
                        value={(value as string) || ''}
                        onChange={onChange}
                        className={`w-full px-4 py-3 rounded-xl border ${errors[field.name] ? 'border-rose-500' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] bg-white`}
                      >
                        {!value && <option value="" disabled>Select {field.label}</option>}
                        {field.options.map((opt, idx) => (
                          <option key={uniqueKey('opt', undefined, `${opt}-${idx}`)} value={opt}>{opt}</option>
                        ))}
                      </select>
                    );
                  }

                  if (field.type === 'toggle') {
                    return (
                      <button
                        type="button"
                        onClick={() => onChange(!(value as boolean))}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${(value as boolean) ? 'bg-[#d49b35] text-white' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {(value as boolean) ? 'Yes' : 'No'}
                      </button>
                    );
                  }

                  if (field.type === 'date') {
                    return (
                      <input
                        type="date"
                        value={(value as string) || ''}
                        onChange={onChange}
                        className={`w-full px-4 py-3 rounded-xl border ${errors[field.name] ? 'border-rose-500' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]`}
                      />
                    );
                  }

                  return null;
                }}
              />
              
              {field.helpText && <p className="text-[11px] text-slate-500 mt-1.5 italic">{field.helpText}</p>}
              {errors[field.name] && <p className="text-[11px] text-rose-500 mt-1.5 font-bold">{errors[field.name]?.message as string}</p>}
            </div>
          );
        })}

        {user?.role === 'EVENTS' && venueSpaces.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Select Venue Space to Quote (Optional)</label>
              <Controller
                name="venueSpaceId"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <select 
                    value={(value as string | number) || ''}
                    onChange={onChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] bg-white"
                  >
                    <option value="">No specific space / General quote</option>
                    {venueSpaces.map((space, idx) => (
                      <option key={uniqueKey('venue-space', space.id, idx)} value={space.id}>{space.name} (Capacity: {space.capacity})</option>
                    ))}
                  </select>
                )}
              />
            </div>
            {formData.venueSpaceId && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Damage Deposit (ZMW)</label>
                  <Controller
                    name="damageDeposit"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={(value as string | number) || ''}
                        onChange={onChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Cleaning Fee (ZMW)</label>
                  <Controller
                    name="cleaningFee"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={(value as string | number) || ''}
                        onChange={onChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]"
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {calculatedTotal > 0 && (
          <div className="bg-[#fffaf5] border border-[#d49b35]/20 p-4 rounded-xl mt-6">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Quote Amount</p>
            <p className="text-2xl font-black text-[#d49b35]">ZMW {calculatedTotal.toLocaleString()}</p>
          </div>
        )}
        
        <div className="pt-4 flex gap-3">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="flex-[2] px-4 py-3 bg-[#1e293b] text-white text-sm font-bold rounded-xl hover:bg-[#0f172a] transition-all shadow-lg shadow-slate-200"
          >
            Send Quotation
          </button>
        </div>
      </form>
    </div>
  );
};

interface ProviderLeadsViewProps {
  user: any;
  leads: any[];
  isSelectionMode: boolean;
  selectedInquiryIds: number[];
  quotingInquiryId: number | null;
  itemPrices: Record<string, number>;
  venueSpaces: any[];
  onArchiveSelected: () => void;
  onDeleteSelected: () => void;
  onSetSelectionMode: (value: boolean) => void;
  onSetSelectedInquiryIds: (ids: number[]) => void;
  onSetItemPrices: (prices: Record<string, number>) => void;
  onSetQuotingInquiryId: (id: number | null) => void;
  onQuoteSubmit: (inquiryId: number, quoteData: any) => void;
  renderSpecifications: (specs: any, category?: string, title?: string) => React.ReactNode;
}

export default function ProviderLeadsView({
  user,
  leads,
  isSelectionMode,
  selectedInquiryIds,
  quotingInquiryId,
  itemPrices,
  venueSpaces,
  onArchiveSelected,
  onDeleteSelected,
  onSetSelectionMode,
  onSetSelectedInquiryIds,
  onSetItemPrices,
  onSetQuotingInquiryId,
  onQuoteSubmit,
  renderSpecifications
}: ProviderLeadsViewProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-0 sm:px-0">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Incoming Booking Requests</h2>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Based on your categories: <span className="text-[#d49b35]">{user?.categories?.join(', ') || 'All Categories'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode && selectedInquiryIds.length > 0 && (
            <>
              <button 
                onClick={onArchiveSelected} 
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#d49b35] rounded-md hover:bg-[#b8862d] transition-colors"
              >
                Archive {selectedInquiryIds.length}
              </button>
              <button 
                onClick={onDeleteSelected} 
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors"
              >
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

      <div className="space-y-4 sm:space-y-6">
        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center border border-slate-100">
            <PackageOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No leads at the moment.</p>
          </div>
        ) : leads.map((lead, idx) => (
          <div key={uniqueKey('leads-tab-lead', lead.id, idx)} className={`bg-white rounded-2xl sm:rounded-[32px] shadow-sm border ${selectedInquiryIds.includes(lead.id!) ? 'border-[#d49b35] bg-[#fffaf5]' : 'border-slate-100'} overflow-hidden transition-colors`}>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSelectionMode && (
                  <input 
                    type="checkbox"
                    checked={selectedInquiryIds.includes(lead.id!)}
                    onChange={(e) => {
                      if (e.target.checked) onSetSelectedInquiryIds([...selectedInquiryIds, lead.id!]);
                      else onSetSelectedInquiryIds(selectedInquiryIds.filter(id => id !== lead.id!));
                    }}
                    className="w-5 h-5 accent-[#d49b35]"
                  />
                )}
                <div className="w-10 h-10 rounded-full bg-[#fdf6e9] flex items-center justify-center text-[#d49b35] font-bold text-sm overflow-hidden border border-[#d49b35]/20">
                  <img 
                    src={`https://picsum.photos/seed/${lead.buyerId}/100/100`} 
                    alt={lead.buyerName} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{lead.buyerName}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Matched Inquiry</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[11px] text-slate-400 font-bold">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {lead.location}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {(lead.category || '').split(', ').map((cat: string, catIdx: number) => (
                  <span key={uniqueKey('lead-cat', undefined, `${lead.id || idx}-${catIdx}`)} className="px-2 py-0.5 bg-[#fdf6e9] text-[#d49b35] text-[10px] font-bold rounded uppercase tracking-wider">
                    {cat}
                  </span>
                ))}
              </div>
              
              <h4 className="text-xl font-serif font-bold text-slate-900 mb-2 break-words">{lead.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 break-words whitespace-pre-wrap">{lead.description}</p>

              {lead.preferences && (
                <div className="flex flex-wrap gap-3 mb-6">
                  {Object.entries(lead.preferences).map(([key, value], prefIdx) => value && (
                    <div key={uniqueKey('lead-pref', undefined, `${lead.id || idx}-${prefIdx}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key}:</span>
                      <span className="text-[11px] font-bold text-slate-700">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {lead.attributes && (
                <div className="mb-6">
                  {renderSpecifications(lead.attributes, lead.category || "", "Inquiry Details")}
                </div>
              )}

              {lead.entertainmentData && (
                <div className="mb-6">
                  {renderSpecifications(lead.entertainmentData, lead.category || "", "Event Specifications")}
                </div>
              )}

              {lead.repairData && (
                <div className="mb-6">
                  {renderSpecifications(lead.repairData, lead.category || "", "Repair Specifications")}
                </div>
              )}

              {lead.items && lead.items.length > 0 && (
                <div className="space-y-4">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Requested Items ({lead.items.length})
                  </h5>
                <div className="grid grid-cols-1 gap-4">
                  {lead.items.map((item: any, itemIdx: number) => (
                    <div 
                      key={uniqueKey('lead-item', item.id, `${lead.id || idx}-${itemIdx}`)} 
                      className={`bg-slate-50/50 rounded-2xl p-4 border transition-all ${quotingInquiryId === lead.id ? 'cursor-pointer hover:border-[#d49b35]/30' : 'border-slate-100'}`}
                      onClick={() => {
                        if (quotingInquiryId === lead.id) {
                          document.getElementById(`item-price-${lead.id}-${itemIdx}`)?.focus();
                        }
                      }}
                    >
                      <div className="flex gap-4">
                        {item.images && item.images.length > 0 && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h6 className="font-bold text-slate-900 text-sm">{item.title}</h6>
                            <span className="text-[10px] font-bold text-[#d49b35] bg-[#fdf6e9] px-2 py-0.5 rounded border border-[#d49b35]/10">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {item.brand && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Brand:</span> {item.brand}</div>}
                            {item.material && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Material:</span> {item.material}</div>}
                            {item.dimensions && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Size:</span> {item.dimensions}</div>}
                            {item.finish && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Finish:</span> {item.finish}</div>}
                          </div>
                        </div>
                      </div>
                      {item.images && item.images.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {item.images.slice(1).map((img: string, imgIdx: number) => (
                            <div key={uniqueKey('lead-item-img', undefined, `${lead.id || idx}-${itemIdx}-${imgIdx}`)} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                              <img src={img} alt={`Ref ${imgIdx + 2}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      {quotingInquiryId === lead.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Price (ZMW)</label>
                            <input 
                              id={`item-price-${lead.id}-${itemIdx}`}
                              type="number"
                              placeholder="0.00"
                              value={itemPrices[`${lead.id}-${itemIdx}`] || ''}
                              onChange={(e) => onSetItemPrices({
                                ...itemPrices,
                                [`${lead.id}-${itemIdx}`]: Number(e.target.value)
                              })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-[#d49b35] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  {lead.viewCount || 0} Views
                </div>
                <button 
                  onClick={() => onSetQuotingInquiryId(lead.id!)}
                  className="px-8 py-3 bg-[#d49b35] text-white text-sm font-bold rounded-2xl hover:bg-[#a37d35] transition-all shadow-lg shadow-[#d49b35]/20 active:scale-95"
                >
                  Submit Quote
                </button>
              </div>

              {quotingInquiryId === lead.id && (
                <QuoteSubmissionForm 
                  inquiry={lead} 
                  onSubmit={(data) => onQuoteSubmit(lead.id!, data)} 
                  onCancel={() => onSetQuotingInquiryId(null)} 
                  venueSpaces={venueSpaces} 
                  user={user} 
                  itemPricesTotal={
                    lead.items.some((_: any, idx: number) => itemPrices[`${lead.id}-${idx}`])
                      ? lead.items.reduce((sum: number, _: any, idx: number) => sum + Number(itemPrices[`${lead.id}-${idx}`] || 0), 0)
                      : 0
                  }
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
