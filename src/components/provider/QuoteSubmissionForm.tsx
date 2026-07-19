import React, { useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Loader2, UploadCloud, Send } from 'lucide-react';
import { generateQuoteSchema, QuoteField } from '../../services/quoteSchemaGenerator';
import { getEffectiveBusinessTypes } from '../../services/categories';
import { useActiveProfileContext } from '../../hooks/useActiveProfileContext';
import { uniqueKey } from '../../utils/keyUtils';
import { API_BASE_URL, apiClient } from '../../services/api/client';

// Field-name → section fallback when a QuoteField doesn't carry an
// explicit `group`. Keeps the existing archetype-based schemas
// (REPAIR / PRODUCT / SERVICE / VENUE / LABOUR / GENERIC) rendering
// under the new section dividers without per-field annotation.
const PRICING_NAMES = new Set([
  'price', 'securityDeposit', 'setupFee', 'deliveryFee', 'optionalDeliveryFee',
  'optionalDeliveryOffer', 'diagnosisFee', 'partsCost', 'labourHours', 'labourRate',
  'rateUnit', 'damageDeposit', 'cleaningFee', 'condition', 'warranty', 'maxCapacity',
  'numberOfWorkers', 'venueAmenities',
]);
const LOGISTICS_NAMES = new Set([
  'availabilityDate', 'leadTime', 'expiryDuration', 'turnaroundDays', 'warrantyDays',
]);

const sectionFor = (field: QuoteField): 'Pricing' | 'Logistics & Timing' | 'Notes & Photos' => {
  if (field.group) return field.group;
  if (PRICING_NAMES.has(field.name)) return 'Pricing';
  if (LOGISTICS_NAMES.has(field.name)) return 'Logistics & Timing';
  return 'Notes & Photos';
};

function SectionDivider({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="w-[3px] h-9 rounded-full bg-[#C9973A]" />
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#C9973A]">{eyebrow}</p>
        <h4 className="font-serif text-[17px] font-bold text-slate-900 leading-tight">{title}</h4>
      </div>
    </div>
  );
}

interface QuoteSubmissionFormProps {
  inquiry: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  venueSpaces: any[];
  user: any;
  itemPricesTotal: number;
  initialValues?: any;
  parentQuoteId?: string;
}

// Typography tokens. The inquiry-side panels (PreferenceTags,
// DynamicDataDisplay) use a specific, deliberate scale: 10px black
// 0.2em-tracked uppercase labels, 15px black value text, slate-500
// helper copy. This form lived on a parallel scale (`font-bold` vs
// `font-black`, `tracking-widest` vs `tracking-[0.2em]`, italic helper
// text, 14px inputs) — the panes felt randomly mismatched when seen
// side-by-side. These tokens line both panes onto one ramp.
const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[15px] font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] bg-white';
const labelClass = 'block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5';
const helpClass = 'text-[11px] text-slate-500 mt-1.5 leading-relaxed';
const errorClass = 'text-[11px] text-rose-500 mt-1 font-bold';

export default function QuoteSubmissionForm({
  inquiry,
  onSubmit,
  onCancel,
  venueSpaces,
  user,
  itemPricesTotal,
  initialValues,
  parentQuoteId,
}: QuoteSubmissionFormProps) {
  const { context: activeContext } = useActiveProfileContext();
  const [referencePhotos, setReferencePhotos] = useState<string[]>(initialValues?.referencePhotos || []);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fields: quoteSchema, zodSchema } = useMemo(
    // Prefer the stable category id: the backend hydrates `category` as a
    // comma-joined display NAME, which can never match the id-keyed
    // QUOTE_SCHEMA_BY_CATEGORY_ID overrides. Same pattern as
    // ProviderLeadsView's schema lookups.
    () => generateQuoteSchema(inquiry.categoryIds?.[0] || inquiry.category || '', inquiry.attributes || {}, 'EXPRESS'),
    [inquiry.categoryIds, inquiry.category, inquiry.attributes]
  );

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: {
      condition: initialValues?.condition || ((inquiry.category || '').toLowerCase().includes('product') ? 'Brand New' : 'N/A'),
      rateUnit: initialValues?.rateUnit || 'Per Hour',
      venueAmenities: initialValues?.venueAmenities || [],
      ...Object.fromEntries(quoteSchema.map((f) => [
        f.name, 
        initialValues?.[f.name] !== undefined 
          ? initialValues[f.name] 
          : (f.type === 'toggle' ? false : f.type === 'multiselect' ? [] : '')
      ])),
      ...initialValues, // Spread all initial values if any
    },
  });

  const formData = watch();

  const calculatedTotal = useMemo(() => {
    let total = 0;
    let hasCalc = false;
    
    // Safety check for formData
    if (!formData) return 0;

    quoteSchema.forEach((field) => {
      const fieldVal = Number(formData[field.name]) || 0;
      if (fieldVal <= 0) return;

      if (field.calculation === 'unit' || field.calculation === 'rate') {
        let fieldTotal = fieldVal;
        
        // Multiply by quantity if applicable
        const qty = Number(inquiry.attributes?.quantity || inquiry.attributes?.expectedGuests || 1);
        if (field.calculation === 'unit') {
          fieldTotal *= qty;
        }
        
        // Multiply by duration if applicable
        if (inquiry.attributes?.rentalDuration) {
          fieldTotal *= Number(inquiry.attributes.rentalDuration);
        }

        total += fieldTotal;
        hasCalc = true;
      }
    });

    if (!hasCalc) {
      // Robust fallback to 'price' field or any field that is likely the main price
      total = Number(formData.price || formData.venueHireFee || formData.serviceFee || 0);
      if (total === 0 && itemPricesTotal > 0) {
        total = itemPricesTotal;
      }
    }
    return total;
  }, [formData, quoteSchema, inquiry.attributes, itemPricesTotal]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const newFiles = Array.from(files).slice(0, 5 - referencePhotos.length);
      const uploadedUrls: string[] = [];

      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('file', file);

        // apiClient attaches the JWT (refreshing if expired) and throws on any
        // non-OK response — no manual response.ok check needed.
        const result = await apiClient.post<{ url: string }>(
          `/files/upload?category=quotes`,
          formData
        );

        const fileUrl = result.data?.url;
        if (fileUrl) {
          uploadedUrls.push(`${API_BASE_URL}${fileUrl}`);
        }
      }

      setReferencePhotos(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setReferencePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onFormSubmit = (data: any) => {
    onSubmit({ 
      ...data, 
      calculatedTotal, 
      processType: inquiry.processType,
      referencePhotos,
      parentQuoteId
    });
  };

  const renderField = (field: typeof quoteSchema[0]) => {
    // Hide delivery fee unless delivery toggle is on
    if (field.name === 'optionalDeliveryFee' && !formData.optionalDeliveryOffer) return null;
    if (!field.name) return null;

    // Special case for Labour Rate (side-by-side)
    if (field.name === 'price' && (inquiry.category || '').toLowerCase().includes('labour')) {
      return (
        <div key="labour-rate-group" className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Rate (ZMW) <span className="text-rose-500">*</span></label>
            <Controller
              name="price"
              control={control}
              render={({ field: { onChange, value } }: any): React.ReactElement => (
                <div className="relative">
                  <input type="number" value={(value as any) || ''} onChange={onChange} className={`${inputClass} pl-12`} placeholder="0.00" />
                  <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">ZMW</span>
                </div>
              )}
            />
            {errors.price && <p className={errorClass}>{errors.price.message as string}</p>}
          </div>
          <div className="w-1/2">
            <label className={labelClass}>Rate Per <span className="text-rose-500">*</span></label>
            <Controller
              name="rateUnit"
              control={control}
              render={({ field: { onChange, value } }: any): React.ReactElement => (
                <select value={(value as any) || ''} onChange={onChange} className={inputClass}>
                  {['Per Hour', 'Per Day', 'Per Week', 'Per Month'].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
            />
            {errors.rateUnit && <p className={errorClass}>{errors.rateUnit.message as string}</p>}
          </div>
        </div>
      );
    }

    // Skip rateUnit if we already handled it above
    if (field.name === 'rateUnit' && (inquiry.category || '').toLowerCase().includes('labour')) return null;

    return (
      <div key={uniqueKey('qf', undefined, field.name)}>
        <label className={labelClass}>
          {field.label}
          {field.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <Controller
          name={field.name as any}
          control={control}
          render={({ field: { onChange, value } }: any): React.ReactElement => {
            if (field.type === 'currency') {
              return (
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      value={field.name === 'price' && itemPricesTotal > 0 ? itemPricesTotal : (value as any) || ''}
                      onChange={onChange}
                      readOnly={field.name === 'price' && itemPricesTotal > 0}
                      className={`${inputClass} pl-12 ${field.name === 'price' && itemPricesTotal > 0 ? 'bg-slate-50 text-[#d49b35] font-bold' : ''}`}
                      placeholder="0.00"
                    />
                    <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">ZMW</span>
                  </div>
                  {field.calculation === 'unit' && inquiry.attributes?.quantity && (
                    <span className={`${helpClass} block`}>
                      × {inquiry.attributes.quantity} units = ZMW {((Number(value) || 0) * Number(inquiry.attributes.quantity)).toLocaleString()}
                    </span>
                  )}
                  {field.calculation === 'rate' && inquiry.attributes?.rentalDuration && (
                    <span className={`${helpClass} block`}>
                      × {inquiry.attributes.rentalDuration} days = ZMW {((Number(value) || 0) * Number(inquiry.attributes.rentalDuration)).toLocaleString()}
                    </span>
                  )}
                </div>
              );
            }
            if (field.type === 'number') {
              return <input type="number" value={(value as any) || ''} onChange={onChange} className={inputClass} placeholder={field.placeholder} />;
            }
            if (field.type === 'textarea') {
              return <textarea value={(value as any) || ''} onChange={onChange} className={`${inputClass} resize-none`} placeholder={field.placeholder} rows={2} />;
            }
            if (field.type === 'select' && field.options) {
              return (
                <select value={(value as any) || ''} onChange={onChange} className={inputClass}>
                  {!value && <option value="" disabled>Select…</option>}
                  {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              );
            }
            if (field.type === 'toggle') {
              return (
                <button
                  type="button"
                  onClick={() => onChange(!(value as boolean))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${(value as boolean) ? 'bg-[#d49b35] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {(value as boolean) ? 'Yes' : 'No'}
                </button>
              );
            }
            if (field.type === 'date') {
              return <input type="date" value={(value as any) || ''} onChange={onChange} className={inputClass} />;
            }
            if (field.type === 'multiselect' && field.options) {
              const currentVals = Array.isArray(value) ? value : [];
              return (
                <div className="flex flex-wrap gap-2">
                  {field.options.map((opt) => {
                    const isSelected = currentVals.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const next = isSelected ? currentVals.filter(v => v !== opt) : [...currentVals, opt];
                          onChange(next);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isSelected ? 'bg-[#d49b35] border-[#d49b35] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-[#d49b35]/30'}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              );
            }
            return <></>;
          }}
        />
        {field.helpText && <p className={helpClass}>{field.helpText}</p>}
        {errors[field.name] && <p className={errorClass}>{errors[field.name]?.message as string}</p>}
      </div>
    );
  };

  // Group dynamic schema fields into the three section buckets so the
  // form reads as Pricing → Logistics → Notes instead of an
  // undifferentiated stack. Renderable fields only (some are filtered
  // by renderField — e.g. the Labour rate-with-unit pair handles itself
  // and skips its sibling).
  const grouped: Record<'Pricing' | 'Logistics & Timing' | 'Notes & Photos', QuoteField[]> = {
    Pricing: [],
    'Logistics & Timing': [],
    'Notes & Photos': [],
  };
  quoteSchema.forEach((f) => grouped[sectionFor(f)].push(f));

  const showVenueSpaces =
    getEffectiveBusinessTypes(user as any, activeContext).includes('EVENTS') &&
    venueSpaces.length > 0;

  return (
    <div className="bg-white">
      {/* Premium card-style header — gold eyebrow + serif title, with a
          running-total summary strip when the form has resolved a
          number. The EXPRESS / STANDARD chip stays as the single
          coloured accent on the right. */}
      <div className="mb-7 pb-5 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] font-black text-[#C9973A] uppercase tracking-[0.28em]">
              Quotation
            </span>
            <h5 className="font-serif text-[24px] font-bold text-slate-900 leading-none tracking-tight">
              Your Offer
            </h5>
            <p className="text-[12px] text-slate-500 font-medium mt-1.5 leading-relaxed">
              Fill what's required. The buyer will review side-by-side with other quotes.
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] ${inquiry.processType === 'EXPRESS' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
            {inquiry.processType || 'STANDARD'}
          </span>
        </div>
        {calculatedTotal > 0 && (
          <div className="mt-5 bg-gradient-to-br from-[#fdf6e9] to-[#fdf6e9]/60 border border-[#C9973A]/25 px-4 py-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-1">
                Running Total
              </p>
              <p className="font-serif text-[22px] font-black text-[#1a1a2e] leading-none">
                ZMW {calculatedTotal.toLocaleString()}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9973A]/70 text-right max-w-[140px] leading-tight">
              Auto-calculated as you type
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-7">
        {/* ── Pricing section ── */}
        {grouped['Pricing'].length > 0 && (
          <div className="space-y-5">
            <SectionDivider eyebrow="Section 01" title="Pricing" />
            <div className="space-y-5 pl-5">
              {grouped['Pricing'].map(renderField)}
            </div>
          </div>
        )}

        {/* Venue space selector — events persona only, slotted into
            Pricing visually since the deposit/cleaning fees live here. */}
        {showVenueSpaces && (
          <div className="space-y-3 pl-5">
            <div>
              <label className={labelClass}>Venue Space (Optional)</label>
              <Controller
                name={'venueSpaceId' as any}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <select value={(value as any) || ''} onChange={onChange} className={inputClass}>
                    <option value="">No specific space</option>
                    {venueSpaces.map((space, i) => (
                      <option key={uniqueKey('vs', space.id, i)} value={space.id}>
                        {space.name} (Seated: {space.capacitySeating})
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            {(formData as any).venueSpaceId && (
              <div className="grid grid-cols-2 gap-3">
                {(['damageDeposit', 'cleaningFee'] as Array<'damageDeposit' | 'cleaningFee'>).map((fname) => (
                  <div key={fname}>
                    <label className={labelClass}>{fname === 'damageDeposit' ? 'Damage Deposit' : 'Cleaning Fee'} (ZMW)</label>
                    <Controller
                      name={fname as any}
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <input type="number" placeholder="0.00" value={(value as any) || ''} onChange={onChange} className={inputClass} />
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Logistics & Timing section ── */}
        {grouped['Logistics & Timing'].length > 0 && (
          <div className="space-y-5">
            <SectionDivider eyebrow="Section 02" title="Logistics and Timing" />
            <div className="space-y-5 pl-5">
              {grouped['Logistics & Timing'].map(renderField)}
            </div>
          </div>
        )}

        {/* ── Notes & Photos section ── */}
        {(grouped['Notes & Photos'].length > 0 || true) && (
          <div className="space-y-5">
            <SectionDivider eyebrow="Section 03" title="Notes and Photos" />
            <div className="space-y-5 pl-5">
              {grouped['Notes & Photos'].map(renderField)}

              {/* Reference Photos preview / picker — lives in this
                  section because it's accompanying context for the
                  buyer rather than pricing or scheduling data. */}
              {referencePhotos.length > 0 ? (
                <div>
                  <label className={labelClass}>Reference Photos</label>
                  <div className="flex flex-wrap gap-2">
                    {referencePhotos.map((url, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200">
                        <img src={url} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-xl"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#C9973A]/40 hover:text-[#C9973A] hover:bg-[#fdf6e9]/40 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold text-[12px] uppercase tracking-[0.14em] hover:border-[#C9973A]/40 hover:bg-[#fdf6e9]/40 hover:text-[#C9973A] transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Add Reference Photos
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sticky action footer — keeps Submit reachable without
            scrolling on long quotes. Opaque, no backdrop-blur: blur on
            sticky strips ghosts on budget Android GPUs. */}
        <div className="sticky bottom-0 -mx-5 sm:-mx-6 px-5 sm:px-6 py-4 bg-white border-t border-slate-200/70 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold uppercase tracking-[0.16em] rounded-full hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-[#1a1a2e] text-white text-[13px] font-bold rounded-full hover:bg-black transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>{parentQuoteId ? 'Send Revised Quotation' : 'Submit Quotation'}</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Photo Upload Modal */}
      <AnimatePresence>
        {isPhotoModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900">Reference Photos</h3>
                <button onClick={() => setIsPhotoModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center gap-3 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-[#d49b35]/50 hover:bg-[#fdf6e9]/30 cursor-pointer'}`}
                >
                  {isUploading ? <Loader2 className="w-10 h-10 text-[#d49b35] animate-spin" /> : <UploadCloud className="w-10 h-10 text-[#d49b35]" />}
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900">Tap to upload photos</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Up to 5 images • JPG, PNG</p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e.target.files)} 
                  />
                </div>

                {referencePhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {referencePhotos.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-black rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
