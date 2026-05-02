import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ImagePlus,
  CalendarDays,
  Minus,
  Plus,
  AlertCircle,
  Loader2,
  Send,
  X,
  PlusCircle,
  ShoppingBasket,
  Check,
  ArrowRight,
  Sparkles,
  Camera,
  Target,
  Clock,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, Controller, FieldValues } from 'react-hook-form';
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
  processType,
}: DynamicInquiryFormProps) {
  const [view, setView] = useState<'form' | 'catalog'>('form');
  const [selectedItems, setSelectedItems] = useState<Record<string, any>>({});
  const [currentDetailItem, setCurrentDetailItem] = useState<
    (typeof RENTAL_CATALOG_ITEMS)[0] | null
  >(null);
  const [tempItemData, setTempItemData] = useState<Record<string, any>>({});
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSchema =
    processType === 'EXPRESS'
      ? schema.filter(
          (f) =>
            f.required ||
            f.name === 'images' ||
            f.name === 'budget_limit' ||
            f.name === 'description'
        )
      : schema;

  const zodSchema = generateZodSchema(activeSchema);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(zodSchema),
    defaultValues: activeSchema.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]:
          field.type === 'counter' ? field.min || 1 : field.type === 'toggle' ? false : '',
      }),
      {}
    ),
  });

  const formValues = watch();

  const isEquipmentRental = categoryName.toLowerCase().includes('equipment rental');

  const onFormSubmit = (data: Record<string, any>) => {
    // Combine core data with selected items
    const finalData = {
      ...data,
      rentalItems: selectedItems,
    };
    onSubmit(finalData);
  };

  const handleImageUpload = async (name: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingFields((prev) => new Set(prev).add(name));

    try {
      const currentImages = ((formValues as any)[name] as string[]) || [];
      const newFiles = Array.from(files).slice(0, 5 - currentImages.length);
      const uploadedUrls: string[] = [];

      // Upload files one by one
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`http://localhost:3001/files/upload?category=inquiries`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }

        const data = await response.json();
        console.log('Upload response:', data);

        // TransformInterceptor wraps response in { statusCode, message, data }
        const fileData = data.data || data;
        const fileUrl = fileData.url;

        if (!fileUrl) {
          throw new Error(`No URL in response: ${JSON.stringify(data)}`);
        }

        // Convert relative URL to absolute URL
        const absoluteUrl = `http://localhost:3001${fileUrl}`;
        uploadedUrls.push(absoluteUrl);
      }

      // Update form with uploaded file URLs
      (setValue as any)(name, [...currentImages, ...uploadedUrls]);
    } catch (error) {
      console.error('Image upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingFields((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const removeImage = (name: string, index: number) => {
    const currentImages = ((formValues as any)[name] as string[]) || [];
    const updatedImages = currentImages.filter((_: any, i: number) => i !== index);
    (setValue as any)(name, updatedImages);
  };

  const requiredFields = activeSchema.filter((f) => f.required);
  const filledRequiredFields = requiredFields.filter((f) => {
    const val = (formValues as any)[f.name];
    return (
      val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)
    );
  });
  const progress =
    requiredFields.length > 0 ? (filledRequiredFields.length / requiredFields.length) * 100 : 0;

  const renderField = (field: FieldSchema, isTemp: boolean = false) => {
    // Check dependency
    if (field.dependsOn) {
      const dependentValue = (formValues as any)[field.dependsOn.field];
      if (dependentValue !== field.dependsOn.value) {
        return null;
      }
    }

    const error = (errors as any)[field.name]?.message as string | undefined;

    if (!field.name) {
      console.warn('Field missing name:', field);
      return null;
    }

    const fieldContent = (
      <Controller
        name={field.name as any}
        control={control as any}
        render={({ field: { onChange, value } }) => {
          switch (field.type) {
            case 'text':
            case 'number':
              return (
                <div
                  className={`flex items-center bg-white border-[1.5px] rounded-[12px] px-4 py-3.5 transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#e2e8f0]'}`}
                >
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={(value as string | number) || ''}
                    onChange={(e) =>
                      onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
                    }
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    className="w-full bg-transparent border-none outline-none font-sans text-[15px] text-[#1a1a2e] placeholder:text-[#94a3b8]"
                  />
                </div>
              );
            case 'textarea':
              return (
                <div
                  className={`flex items-start bg-white border-[1.5px] rounded-xl px-4 py-3.5 min-h-25 transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-brand-error shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#e2e8f0]'}`}
                >
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
                <div className="flex items-center bg-white border-[1.5px] border-[#e2e8f0] rounded-xl overflow-hidden w-fit min-w-40">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    type="button"
                    onClick={() => onChange(Math.max(field.min ?? 0, (Number(value) || 0) - 1))}
                    disabled={field.min !== undefined && (Number(value) || 0) <= field.min}
                    className="w-12 h-13 bg-[#f8fafc] border-r border-[#e2e8f0] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <Minus
                      className={`w-4.5 h-4.5 ${field.min !== undefined && (Number(value) || 0) <= field.min ? 'text-[#d1d5db]' : 'text-[#1a1a2e]'}`}
                    />
                  </motion.button>
                  <div className="flex-1 text-center px-4 font-serif text-[22px] font-bold text-[#C9973A]">
                    {(value as React.ReactNode) || field.min || 0}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    type="button"
                    onClick={() =>
                      onChange(Math.min(field.max ?? Infinity, (Number(value) || 0) + 1))
                    }
                    disabled={field.max !== undefined && (Number(value) || 0) >= field.max}
                    className="w-12 h-13 bg-[#C9973A] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Plus className="w-4.5 h-4.5 text-white" />
                  </motion.button>
                </div>
              );
            case 'currency':
              return (
                <div
                  className={`flex items-stretch bg-white border-[1.5px] rounded-xl overflow-hidden transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-brand-error shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#e2e8f0]'}`}
                >
                  <div className="w-18 bg-[rgba(201,151,58,0.08)] border-r-[1.5px] border-[rgba(201,151,58,0.2)] flex items-center justify-center font-sans text-[12px] font-bold text-[#C9973A] tracking-[0.05em]">
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
                    options={field.options.map((opt) => ({ value: opt, label: opt }))}
                    value={String(value || '')}
                    onChange={onChange}
                    placeholder={field.placeholder || `Select ${field.label}`}
                  />
                );
              }
              return (
                <div className="flex flex-wrap gap-x-2.5 gap-y-3">
                  {field.options?.map((option, idx) => (
                    <motion.button
                      key={`${option}-${idx}`}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => onChange(option)}
                      className={`px-4.5 py-2.5 rounded-[50px] font-sans text-[13px] transition-all duration-[0.18s] ${
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
            case 'multiselect': {
              const safeValue = typeof value === 'string' ? value : '';
              const selectedValues = safeValue ? safeValue.split(',') : [];
              return (
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((opt: string) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const newValues = selectedValues.includes(opt)
                          ? selectedValues.filter((v) => v !== opt)
                          : [...selectedValues, opt];
                        onChange(newValues.join(','));
                      }}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                        selectedValues.includes(opt)
                          ? 'bg-[#C9973A] text-white'
                          : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              );
            }
            case 'date':
              return (
                <div
                  className={`flex items-center bg-white border-[1.5px] rounded-xl px-4 py-3.5 transition-all duration-200 focus-within:border-[#C9973A]/50 focus-within:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] ${error ? 'border-brand-error shadow-[0_0_0_3px_rgba(239,68,68,0.08)]' : 'border-[#e2e8f0]'}`}
                >
                  <input
                    type="date"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none font-sans text-[15px] text-[#1a1a2e]"
                  />
                  <CalendarDays className="w-4.5 h-4.5 text-[#C9973A] pointer-events-none" />
                </div>
              );
            case 'toggle':
              return (
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <label className="text-[13px] font-semibold text-[#1a1a2e] flex items-center gap-1.5">
                      {field.label}
                      {field.required && <span className="text-[#C9973A] text-[14px]">✦</span>}
                    </label>
                    {field.helpText && (
                      <p className="text-[11px] text-[#94a3b8] mt-1.5 italic">{field.helpText}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(!value)}
                    className={`relative w-12 h-6.5 rounded-[50px] transition-colors duration-[0.25s] ${value ? 'bg-[#C9973A]' : 'bg-[#e2e8f0]'}`}
                  >
                    <motion.span
                      animate={{ x: value ? 25 : 3 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute top-0.75 left-0 w-5 h-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                    />
                  </button>
                </div>
              );
            case 'image_upload':
              const isUploading = uploadingFields.has(field.name);
              return (
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`bg-white border-2 border-dashed rounded-2xl p-[32px_20px] flex flex-col items-center gap-2.5 ${isUploading ? 'cursor-not-allowed opacity-60 border-slate-300' : 'cursor-pointer border-[rgba(201,151,58,0.35)]'}`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-[#C9973A] animate-spin" />
                    ) : (
                      <ImagePlus className="w-8 h-8 text-[#C9973A]" />
                    )}
                    <div className="text-center">
                      <p className="font-sans text-[14px] font-medium text-[#1a1a2e]">
                        {isUploading ? 'Uploading...' : 'Tap to upload photos'}
                      </p>
                      <p className="font-sans text-[11px] text-[#94a3b8]">
                        Up to 5 images • JPG, PNG
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploading}
                      className="hidden"
                      onChange={(e) => handleImageUpload(field.name, e.target.files)}
                    />
                  </div>
                  {value && Array.isArray(value) && (value as any).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {(value as any).map((url: string, idx: number) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative aspect-square rounded-[10px] overflow-hidden"
                        >
                          <img
                            src={url}
                            alt={`Upload ${idx}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image load error:', url);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(field.name, idx)}
                            disabled={isUploading}
                            className={`absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center ${isUploading ? 'opacity-50' : 'hover:bg-black/80'}`}
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            default:
              return <div />;
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
          <label className="text-[13px] font-semibold text-[#1a1a2e] flex items-center justify-between gap-1.5 mb-2">
            <span className="flex items-center gap-1.5">
              {field.label}
              {field.required && <span className="text-[#C9973A] text-[14px]">✦</span>}
            </span>
            {!field.required && (
              <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-wider">
                Optional
              </span>
            )}
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
              className="text-[11px] font-medium text-[#ef4444] mt-1.5 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
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
                className="relative bg-white rounded-3xl overflow-hidden shadow-sm border border-[#f1f5f9] flex flex-col group"
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
                    <p className="text-[14px] font-bold text-[#1a1a2e]">
                      {Object.keys(selectedItems).length} Categories
                    </p>
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
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[480px] bg-white rounded-t-4xl sm:rounded-4xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-[22px] font-bold text-[#1a1a2e]">
                      {currentDetailItem.name}
                    </h3>
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
                    <div key={field.name}>{renderField(field, true)}</div>
                  ))}
                </div>

                <div className="p-6 bg-[#f8fafc] flex gap-3">
                  {selectedItems[currentDetailItem.id] && (
                    <button
                      onClick={() => {
                        setSelectedItems((prev) => {
                          const next = { ...prev };
                          delete next[currentDetailItem.id];
                          return next;
                        });
                        setCurrentDetailItem(null);
                      }}
                      className="flex-1 h-13.5 border border-brand-error text-[#ef4444] rounded-[50px] font-sans text-[15px] font-semibold"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // Extract quantity if exists
                      const quantityKey = currentDetailItem.schema.find((f) =>
                        f.name.toLowerCase().includes('quantity')
                      )?.name;
                      const quantity = quantityKey ? Number(tempItemData[quantityKey]) : 0;

                      setSelectedItems((prev) => ({
                        ...prev,
                        [currentDetailItem.id]: {
                          ...tempItemData,
                          quantity: quantity || 1,
                        },
                      }));
                      setCurrentDetailItem(null);
                    }}
                    className="flex-[2] h-13.5 bg-[#C9973A] rounded-[50px] font-sans text-[15px] font-semibold text-white shadow-lg"
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

  activeSchema.forEach((field) => {
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
    <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full min-h-screen bg-[#f5f2ed]">
      {/* Mobile-only Header */}
      <div className="md:hidden sticky top-0 z-30 px-4 pt-4 pb-5 bg-[#f5f2ed]">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#1a1a2e]"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
            NEW INQUIRY
          </p>
        </div>
        <div className="mt-2">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
            {categoryName}
          </h1>
        </div>
        <div className="mt-4 h-[3px] w-full bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C9973A] transition-all duration-[0.4s]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 md:p-8 lg:p-10 xl:p-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
          {/* Desktop Left-side Context - Sticky */}
          <div className="hidden md:flex flex-col gap-8 w-full md:w-[320px] lg:w-[400px] shrink-0 sticky top-12">
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-[32px] p-8 shadow-sm">
              <motion.button
                whileHover={{ x: -4 }}
                onClick={onBack}
                className="flex items-center gap-2 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider mb-8"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to categories
              </motion.button>

              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#C9973A]/10 rounded-2xl flex items-center justify-center text-[#C9973A]">
                  <ShoppingBasket className="w-8 h-8" />
                </div>
                <h1 className="font-serif text-[32px] font-bold text-[#1a1a2e] leading-[1.1]">
                  {categoryName}
                </h1>
                <p className="text-[14px] text-[#1a1a2e]/60 leading-relaxed font-medium">
                  Provide detailed information to receive accurate quotes from our verified network
                  of providers.
                </p>
              </div>

              <div className="mt-12 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-[#1a1a2e]/40">Form Progress</span>
                  <span className="text-[#C9973A]">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-[#C9973A]/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-[#C9973A]"
                  />
                </div>
              </div>
            </div>

            {/* Why details matter — primes the buyer that richer detail = sharper provider quotes */}
            <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#C9973A]/15 rounded-[32px] p-7">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-1">
                    Tonse Tip
                  </p>
                  <h3 className="font-serif text-[18px] font-bold text-[#1a1a2e] leading-snug">
                    Why details matter
                  </h3>
                </div>
              </div>
              <p className="text-[13px] text-[#1a1a2e]/65 leading-relaxed font-medium mb-5">
                Providers quote based on what you share. The richer your details, the closer their offers will land to what you actually need.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Camera className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Photos</span> let providers identify your exact item — no guesswork.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Brand &amp; specs</span> unlock accurate pricing instead of wide ranges.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Urgency</span> helps providers prioritize and quote realistic timelines.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Wallet className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">A budget hint</span> filters offers to your range — optional but useful.
                  </p>
                </li>
              </ul>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-3 text-[12px] font-medium text-[#1a1a2e]/40 italic">
                <AlertCircle className="w-4 h-4" />
                Responses usually arrive within 2-4 hours
              </div>
            </div>
          </div>

          {/* Right-side Form Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 w-full space-y-8"
          >
            <div className="bg-white border border-[#f1f5f9] rounded-[32px] p-6 md:p-8 xl:p-10 shadow-sm shadow-[#1a1a2e]/[0.02]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-8 md:gap-y-10">
                {ungroupedFields.map((field, idx) => (
                  <div
                    key={field.name || `field-${idx}`}
                    className={
                      // Full-row when content needs horizontal room: long-form text,
                      // image dropzones, and any select rendered as chips (≤4 opts)
                      // or multiselect — keeps the chips on one line instead of wrapping.
                      field.type === 'textarea' ||
                      field.type === 'image_upload' ||
                      field.type === 'multiselect' ||
                      (field.type === 'select' &&
                        field.options &&
                        field.options.length <= 4)
                        ? 'col-span-full'
                        : ''
                    }
                  >
                    {renderField(field)}
                  </div>
                ))}

                {Object.entries(groupedFields).map(([groupName, fields], gIdx) => (
                  <div key={`group-${groupName}-${gIdx}`} className="col-span-full space-y-10">
                    <div className="pt-4">
                      <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#C9973A] font-bold pb-2 border-b border-[#C9973A]/20 mb-10">
                        {groupName}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-8 md:gap-y-10">
                        {fields.map((field, fIdx) => (
                          <div
                            key={field.name || `group-field-${fIdx}`}
                            className={
                              field.type === 'textarea' ||
                              field.type === 'image_upload' ||
                              field.type === 'multiselect' ||
                              (field.type === 'select' &&
                                field.options &&
                                field.options.length <= 4)
                                ? 'col-span-full'
                                : ''
                            }
                          >
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
                <div className="mt-12 flex flex-col gap-6">
                  {/* ... (keep existing rental items logic if needed) ... */}
                </div>
              )}

              {/* Submit Button Section */}
              <div className="pt-12 border-t border-[#f1f5f9] mt-12">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-15 bg-[#1a1a2e] text-white rounded-2xl flex items-center justify-center gap-3 font-sans text-base font-bold shadow-xl shadow-[#1a1a2e]/20 transition-all hover:bg-black disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
                <p className="text-center text-[12px] text-[#94a3b8] mt-6 font-medium">
                  By clicking submit, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
