import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ImagePlus, CalendarDays, Minus, Plus, AlertCircle, Loader2, Send, X, PlusCircle, ShoppingBasket, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldSchema, RENTAL_CATALOG_ITEMS } from '../services/categories';
import { generateZodSchema } from '../services/schemaGenerator';
import CustomDropdown from './CustomDropdown';

interface DynamicInquiryFormProps {
  schema: FieldSchema[];
  categoryName: string;
  onSubmit: (data: Record<string, any>) => void;
  onBack: () => void;
  isLoading?: boolean;
  processType?: 'EXPRESS' | 'STANDARD';
}

export default function DynamicInquiryForm({
  schema,
  categoryName,
  onSubmit,
  onBack,
  isLoading,
  processType
}: DynamicInquiryFormProps) {
  const [view, setView] = useState<'form' | 'catalog'>('form');
  const [selectedItems, setSelectedItems] = useState<Record<string, any>>({});
  const [currentDetailItem, setCurrentDetailItem] = useState<typeof RENTAL_CATALOG_ITEMS[0] | null>(null);
  const [tempItemData, setTempItemData] = useState<Record<string, any>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSchema = processType === 'EXPRESS' 
    ? schema.filter(f => f.required || f.name === 'images' || f.name === 'budget_limit' || f.name === 'description')
    : schema;

  const zodSchema = generateZodSchema(activeSchema);
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: activeSchema.reduce((acc, field) => ({
      ...acc,
      [field.name]: field.type === 'counter' ? (field.min || 1) : (field.type === 'toggle' ? false : '')
    }), {})
  });

  const formValues = watch();

  const isEquipmentRental = categoryName.toLowerCase().includes('equipment rental');

  const onFormSubmit = (data: Record<string, any>) => {
    // Combine core data with selected items
    const finalData = {
      ...data,
      rentalItems: selectedItems
    };
    onSubmit(finalData);
  };

  const handleImageUpload = (name: string, files: FileList | null) => {
    if (!files) return;
    const currentImages = (formValues[name] as string[]) || [];
    const newImages = Array.from(files).slice(0, 5 - currentImages.length);
    const imageUrls = newImages.map(file => URL.createObjectURL(file));
    setValue(name, [...currentImages, ...imageUrls]);
  };

  const removeImage = (name: string, index: number) => {
    const currentImages = (formValues[name] as string[]) || [];
    const updatedImages = currentImages.filter((_: any, i: number) => i !== index);
    setValue(name, updatedImages);
  };

  const requiredFields = activeSchema.filter(f => f.required);
  const filledRequiredFields = requiredFields.filter(f => {
    const val = formValues[f.name];
    return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
  });
  const progress = requiredFields.length > 0 ? (filledRequiredFields.length / requiredFields.length) * 100 : 0;

  const renderField = (field: FieldSchema, isTemp: boolean = false) => {
    // Check dependency
    if (field.dependsOn) {
      const dependentValue = formValues[field.dependsOn.field];
      if (dependentValue !== field.dependsOn.value) {
        return null;
      }
    }

    const error = errors[field.name]?.message as string | undefined;

    const fieldContent = (
      <Controller
        name={field.name}
        control={control}
        render={({ field: { onChange, value } }) => {
          switch (field.type) {
            case 'text':
            case 'number':
              return (
                <div className={`flex items-center bg-white border-[1.5px] rounded-[12px] px-4 py-3.5 transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#f1f5f9]'}`}>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={(value as string | number) || ''}
                    onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    className="w-full bg-transparent border-none outline-none font-sans text-[15px] text-[#1a1a2e] placeholder:text-[#94a3b8]"
                  />
                </div>
              );
            case 'textarea':
              return (
                <div className={`flex items-start bg-white border-[1.5px] rounded-[12px] px-4 py-3.5 min-h-[100px] transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#f1f5f9]'}`}>
                  <textarea
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full bg-transparent border-none outline-none font-sans text-[15px] text-[#1a1a2e] placeholder:text-[#94a3b8] resize-none"
                  />
                </div>
              );
            case 'counter':
              return (
                <div className="flex items-center bg-white border-[1.5px] border-[#f1f5f9] rounded-[12px] overflow-hidden w-fit min-w-[160px]">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    type="button"
                    onClick={() => onChange(Math.max(field.min ?? 0, (Number(value) || 0) - 1))}
                    disabled={field.min !== undefined && (Number(value) || 0) <= field.min}
                    className="w-[48px] h-[52px] bg-[#f8fafc] border-r border-[#f1f5f9] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <Minus className={`w-[18px] h-[18px] ${(field.min !== undefined && (Number(value) || 0) <= field.min) ? 'text-[#d1d5db]' : 'text-[#1a1a2e]'}`} />
                  </motion.button>
                  <div className="flex-1 text-center px-4 font-serif text-[22px] font-bold text-[#C9973A]">
                    {(value as React.ReactNode) || field.min || 0}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    type="button"
                    onClick={() => onChange(Math.min(field.max ?? Infinity, (Number(value) || 0) + 1))}
                    disabled={field.max !== undefined && (Number(value) || 0) >= field.max}
                    className="w-[48px] h-[52px] bg-[#C9973A] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Plus className="w-[18px] h-[18px] text-white" />
                  </motion.button>
                </div>
              );
            case 'currency':
              return (
                <div className={`flex items-stretch bg-white border-[1.5px] rounded-[12px] overflow-hidden transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#f1f5f9]'}`}>
                  <div className="w-[72px] bg-[rgba(201,151,58,0.08)] border-r-[1.5px] border-[rgba(201,151,58,0.2)] flex items-center justify-center font-sans text-[12px] font-bold text-[#C9973A] tracking-[0.05em]">
                    ZMW
                  </div>
                  <input
                    type="number"
                    value={(value as string | number) || ''}
                    onChange={(e) => onChange(Number(e.target.value))}
                    placeholder="0.00"
                    min="0"
                    className="flex-1 px-4 py-3.5 font-sans text-[16px] font-semibold text-[#1a1a2e] bg-transparent border-none outline-none placeholder:text-[#94a3b8]"
                  />
                </div>
              );
            case 'select':
              if (field.options && field.options.length > 4) {
                return (
                  <CustomDropdown
                    options={field.options.map(opt => ({ value: opt, label: opt }))}
                    value={String(value || '')}
                    onChange={onChange}
                    placeholder={field.placeholder || `Select ${field.label}`}
                  />
                );
              }
              return (
                <div className="flex flex-wrap gap-x-[10px] gap-y-[12px]">
                  {field.options?.map((option, idx) => (
                    <motion.button
                      key={`${option}-${idx}`}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => onChange(option)}
                      className={`px-[18px] py-[10px] rounded-[50px] font-sans text-[13px] transition-all duration-[0.18s] ${
                        String(value) === String(option)
                          ? 'bg-[#C9973A] border-[1.5px] border-[#C9973A] text-white shadow-[0_2px_8px_rgba(201,151,58,0.35)] font-semibold'
                          : 'bg-white border-[1.5px] border-[#e2e8f0] text-[#64748b] font-medium'
                      }`}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              );
            case 'date':
              return (
                <div className={`flex items-center bg-white border-[1.5px] rounded-[12px] px-4 py-3.5 transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#f1f5f9]'}`}>
                  <input
                    type="date"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none font-sans text-[15px] text-[#1a1a2e]"
                  />
                  <CalendarDays className="w-[18px] h-[18px] text-[#C9973A] pointer-events-none" />
                </div>
              );
            case 'toggle':
              return (
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <label className="text-[13px] font-semibold text-[#1a1a2e] flex items-center gap-[6px]">
                      {field.label}
                      {field.required && <span className="text-[#C9973A] text-[14px]">✦</span>}
                    </label>
                    {field.helpText && <p className="text-[11px] text-[#94a3b8] mt-[6px] italic">{field.helpText}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(!value)}
                    className={`relative w-[48px] h-[26px] rounded-[50px] transition-colors duration-[0.25s] ${value ? 'bg-[#C9973A]' : 'bg-[#e2e8f0]'}`}
                  >
                    <motion.span
                      animate={{ x: value ? 25 : 3 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="absolute top-[3px] left-0 w-[20px] h-[20px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                    />
                  </button>
                </div>
              );
            case 'image_upload':
              return (
                <div className="flex flex-col gap-1">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border-2 border-dashed border-[rgba(201,151,58,0.35)] rounded-[16px] p-[32px_20px] flex flex-col items-center gap-[10px] cursor-pointer"
                  >
                    <ImagePlus className="w-[32px] h-[32px] text-[#C9973A]" />
                    <div className="text-center">
                      <p className="font-sans text-[14px] font-medium text-[#1a1a2e]">Tap to upload photos</p>
                      <p className="font-sans text-[11px] text-[#94a3b8]">Up to 5 images • JPG, PNG</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImageUpload(field.name, e.target.files)}
                    />
                  </div>
                  {value && Array.isArray(value) && value.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {value.map((url: string, idx: number) => (
                        <div key={`${url}-${idx}`} className="relative aspect-square rounded-[10px] overflow-hidden">
                          <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(field.name, idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                          >
                            <X className="w-[10px] h-[10px] text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            default:
              return null;
          }
        }}
      />
    );

    return (
      <motion.div
        key={field.name}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex flex-col ${error ? 'error-field' : ''}`}
      >
        {field.type !== 'toggle' && (
          <label className="text-[13px] font-semibold text-[#1a1a2e] flex items-center justify-between gap-[6px] mb-2">
            <span className="flex items-center gap-[6px]">
              {field.label}
              {field.required && <span className="text-[#C9973A] text-[14px]">✦</span>}
            </span>
            {!field.required && <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wider">Optional</span>}
          </label>
        )}
        
        {fieldContent}

        {field.type !== 'toggle' && field.helpText && (
          <p className="text-[11px] text-[#94a3b8] mt-[6px] italic">{field.helpText}</p>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] font-medium text-[#ef4444] mt-[6px] flex items-center gap-[4px]"
            >
              <AlertCircle className="w-[12px] h-[12px]" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (view === 'catalog') {
    return (
      <div className="max-w-[480px] mx-auto w-full min-h-screen bg-[#f8fafc]">
        {/* Catalog Header */}
        <div className="sticky top-0 z-30 px-4 pt-4 pb-5 bg-white border-b border-[#f1f5f9]">
          <div className="flex items-center justify-between">
            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={() => setView('form')} 
              className="w-10 h-10 -ml-2 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
            </motion.button>
            <h2 className="font-serif text-[18px] font-bold text-[#1a1a2e]">Item Catalog</h2>
            <div className="w-10" />
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-4 grid grid-cols-2 gap-4 pb-32">
          {RENTAL_CATALOG_ITEMS.map((item) => {
            const isSelected = !!selectedItems[item.id];
            const quantity = selectedItems[item.id]?.quantity || 0;
            
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setCurrentDetailItem(item);
                  setTempItemData(selectedItems[item.id] || {});
                }}
                className="relative bg-white rounded-[24px] overflow-hidden shadow-sm border border-[#f1f5f9] flex flex-col group"
              >
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#C9973A] text-white flex items-center justify-center shadow-lg font-bold text-[12px] z-10">
                      {quantity || '✓'}
                    </div>
                  )}
                </div>
                <div className="p-4 text-left">
                  <p className="font-serif text-[15px] font-bold text-[#1a1a2e]">{item.name}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-1">Tap to specify</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Sticky Review Bar */}
        <AnimatePresence>
          {Object.keys(selectedItems).length > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-[#f1f5f9] z-[120]"
            >
              <div className="max-w-[448px] mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C9973A]/10 flex items-center justify-center">
                    <ShoppingBasket className="w-5 h-5 text-[#C9973A]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#1a1a2e]">{Object.keys(selectedItems).length} Categories</p>
                    <p className="text-[11px] text-[#94a3b8]">Ready to return</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setView('form')}
                  className="bg-[#1a1a2e] text-white px-6 py-3 rounded-full font-sans text-[14px] font-semibold flex items-center gap-2 shadow-lg"
                >
                  Confirm & Return
                  <Check className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Specification Modal */}
        <AnimatePresence>
          {currentDetailItem && (
            <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCurrentDetailItem(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[480px] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-[22px] font-bold text-[#1a1a2e]">{currentDetailItem.name}</h3>
                    <p className="text-[12px] text-[#94a3b8]">Specify your requirements</p>
                  </div>
                  <button 
                    onClick={() => setCurrentDetailItem(null)}
                    className="w-10 h-10 rounded-full bg-[#f8fafc] flex items-center justify-center text-[#94a3b8]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto flex flex-col gap-8">
                  {currentDetailItem.schema.map((field, idx) => (
                    <div key={field.name}>
                      {renderField(field, true)}
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-[#f8fafc] flex gap-3">
                  {selectedItems[currentDetailItem.id] && (
                    <button
                      onClick={() => {
                        setSelectedItems(prev => {
                          const next = { ...prev };
                          delete next[currentDetailItem.id];
                          return next;
                        });
                        setCurrentDetailItem(null);
                      }}
                      className="flex-1 h-[54px] border border-[#ef4444] text-[#ef4444] rounded-[50px] font-sans text-[15px] font-semibold"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // Extract quantity if exists
                      const quantityKey = currentDetailItem.schema.find(f => f.name.toLowerCase().includes('quantity'))?.name;
                      const quantity = quantityKey ? Number(tempItemData[quantityKey]) : 0;
                      
                      setSelectedItems(prev => ({
                        ...prev,
                        [currentDetailItem.id]: {
                          ...tempItemData,
                          quantity: quantity || 1
                        }
                      }));
                      setCurrentDetailItem(null);
                    }}
                    className="flex-[2] h-[54px] bg-[#C9973A] rounded-[50px] font-sans text-[15px] font-semibold text-white shadow-lg"
                  >
                    {selectedItems[currentDetailItem.id] ? 'Update Item' : 'Add to List'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Group fields for Screen A
  const groupedFields: Record<string, FieldSchema[]> = {};
  const ungroupedFields: FieldSchema[] = [];

  activeSchema.forEach(field => {
    if (field.group) {
      if (!groupedFields[field.group]) {
        groupedFields[field.group] = [];
      }
      groupedFields[field.group].push(field);
    } else {
      ungroupedFields.push(field);
    }
  });

  return (
    <div className="max-w-[480px] md:max-w-4xl mx-auto w-full min-h-screen bg-[#f5f2ed]">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-5 bg-[#f5f2ed]">
        <div className="flex items-center gap-3">
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={onBack} 
            className="w-10 h-10 -ml-2 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
          </motion.button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">NEW INQUIRY</p>
        </div>
        
        <div className="mt-2">
          <h1 className="font-serif text-[22px] md:text-[32px] font-bold text-[#1a1a2e] leading-tight">{categoryName}</h1>
        </div>

        <div className="mt-4 h-[3px] w-full overflow-hidden bg-white/50 rounded-full">
          <div 
            className="h-full bg-[#C9973A] transition-all duration-[0.4s] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="relative">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
          className="p-[10px_16px_40px_16px] md:p-[20px_32px_60px_32px] flex flex-col gap-8"
        >
          {/* Use a grid for fields on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {ungroupedFields.map((field, idx) => (
              <div key={field.name} className={field.type === 'textarea' || field.type === 'image_upload' ? 'md:col-span-2' : ''}>
                {renderField(field)}
              </div>
            ))}

            {Object.entries(groupedFields).map(([groupName, fields]) => (
              <div key={groupName} className="md:col-span-2 flex flex-col gap-8">
                <div className="mt-4">
                  <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] pb-1 border-b border-[rgba(201,151,58,0.2)] mb-6">
                    {groupName}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {fields.map((field) => (
                      <div key={field.name} className={field.type === 'textarea' || field.type === 'image_upload' ? 'md:col-span-2' : ''}>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Items Summary Section */}
          {isEquipmentRental && (
            <div className="flex flex-col gap-6">
              {/* ... (keep existing rental items logic) ... */}
            </div>
          )}

          {/* Submit Button - Natural Flow */}
          <div className="pt-8">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto md:px-16 h-[54px] bg-[#C9973A] rounded-[50px] flex items-center justify-center gap-[10px] font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_20px_rgba(201,151,58,0.4)] disabled:bg-[rgba(201,151,58,0.7)] disabled:pointer-events-none transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Inquiry...</span>
                </>
              ) : (
                <>
                  <span>Send Rental Request</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
