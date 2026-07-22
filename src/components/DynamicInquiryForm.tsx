import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL, apiClient } from '../services/api/client';
import { compressImage } from '../utils/compressImage';
import {
  ChevronLeft,
  ImagePlus,
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
import DateTimePicker from './DateTimePicker';
import SecureFile, { isSecureFileUrl } from './SecureFile';
import { formatBytes } from '../utils/fileMeta';

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
  const [itemsError, setItemsError] = useState<string | null>(null);

  // One hidden <input> per image_upload field, keyed by field name. A single
  // shared ref would point at whichever field mounted last, so on a form with
  // more than one document field (e.g. a loan's payslip + bank statement)
  // clicking one dropzone would open the other field's picker.
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeSchema =
    processType === 'EXPRESS'
      ? schema.filter(
          (f) =>
            f.required ||
            f.keepInExpress ||
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

  const isEquipmentRental = categoryName
    .toLowerCase()
    .replace(/-/g, ' ')
    .includes('equipment rental');

  // Clinical Services (Hospital Labs / Pharmacies): the request content is
  // EITHER typed items OR the prescription photo — the image is first-class
  // request content, not just an attachment. Slug-normalized per the
  // category-pattern convention.
  const isClinical = /hospital labs|pharmac/.test(
    categoryName.toLowerCase().replace(/-/g, ' '),
  );

  useEffect(() => {
    if (Object.keys(selectedItems).length > 0 && itemsError) {
      setItemsError(null);
    }
  }, [selectedItems, itemsError]);

  // Clear the clinical either/or error as soon as the buyer supplies either
  // request-content field (mirrors the equipment-rental clear-on-add effect).
  const clinicalTyped = String((formValues as any).requestItems ?? '').trim();
  const clinicalPhotoCount = Array.isArray((formValues as any).prescriptionPhotos)
    ? (formValues as any).prescriptionPhotos.length
    : 0;
  useEffect(() => {
    if (isClinical && itemsError && (clinicalTyped || clinicalPhotoCount > 0)) {
      setItemsError(null);
    }
  }, [isClinical, itemsError, clinicalTyped, clinicalPhotoCount]);

  const onFormSubmit = (data: Record<string, any>) => {
    if (isEquipmentRental && Object.keys(selectedItems).length === 0) {
      setItemsError('Add at least one item from the catalog before submitting.');
      return;
    }
    // Either/or guard: both fields are schema-optional (image_upload isn't
    // zod-enforceable), so requiredness lives here — at least one of the two
    // request-content fields must be present.
    if (isClinical) {
      const typed = String(data.requestItems ?? '').trim();
      const photos = Array.isArray(data.prescriptionPhotos) ? data.prescriptionPhotos : [];
      if (!typed && photos.length === 0) {
        setItemsError('Type what you need or attach your prescription photo.');
        return;
      }
    }
    setItemsError(null);
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
      const field = schema.find((f) => f.name === name);
      const currentImages = ((formValues as any)[name] as string[]) || [];
      // Clamp to zero: a bare `maxFiles - currentImages.length` can go negative
      // and slice from the array's END instead of taking nothing.
      const maxFiles = field?.maxFiles ?? 5;
      const remainingSlots = Math.max(0, maxFiles - currentImages.length);
      const newFiles = Array.from(files).slice(0, remainingSlots);
      const uploadedUrls: string[] = [];

      // Sensitive documents (payslip, bank statement, NRC, licence, collateral,
      // title deed, white book, proof) upload to the encrypted, auth-gated
      // `kyc` category; ordinary reference photos stay public under `inquiries`.
      const isSensitiveDoc =
        /payslip|bank|nrc|licen[cs]e|deed|collateral|white.?book|proof|statement|introduction|kyc/i.test(name);
      const uploadCategory = isSensitiveDoc ? 'kyc' : 'inquiries';

      // Accept images always; PDFs only where the field opts in. Mirrors the
      // backend allow-list (files.service.ts) so we fail fast with a clear
      // message instead of a generic 400 after the round-trip.
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        ...(field?.allowPdf ? ['application/pdf'] : []),
      ];
      const maxBytes = (isSensitiveDoc ? 10 : 5) * 1024 * 1024;

      // Upload files one by one
      for (const file of newFiles) {
        if (file.type && !allowedTypes.includes(file.type)) {
          alert(
            `"${file.name}" isn't a supported format. Upload ${field?.allowPdf ? 'a JPG, PNG, or PDF' : 'a JPG or PNG image'}.`,
          );
          continue;
        }

        // Compress before upload: raw phone captures are multi-MB; the server
        // stores whatever we send (no server-side resizing), so this is the
        // storage-bloat guard. Non-images (PDFs) pass through untouched.
        // Prescription photos stay a readable 1600px — stored as an image
        // only, never OCR'd.
        const compressed = await compressImage(file);
        if (compressed.size > maxBytes) {
          alert(
            `"${file.name}" is ${formatBytes(compressed.size)} — the limit is ${formatBytes(maxBytes)}.`,
          );
          continue;
        }
        const formData = new FormData();
        formData.append('file', compressed);

        // apiClient attaches the JWT (and refreshes it if expired) and throws a
        // descriptive Error on any non-OK response — caught by the outer catch.
        const response = await apiClient.post<{ url: string }>(
          `/files/upload?category=${uploadCategory}`,
          formData
        );

        // TransformInterceptor wraps the payload in { statusCode, message, data }
        const fileData = response.data;
        const fileUrl = fileData?.url;

        if (!fileUrl) {
          throw new Error(`No URL in response: ${JSON.stringify(response)}`);
        }

        // Convert relative URL to absolute URL
        const absoluteUrl = `${API_BASE_URL}${fileUrl}`;
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

  // Only count required fields that are actually VISIBLE — a conditional
  // (dependsOn) field that's hidden shouldn't hold the progress bar back.
  const isFieldVisible = (f: FieldSchema) => {
    if (!f.dependsOn) return true;
    const current = (formValues as any)[f.dependsOn.field];
    return Array.isArray(f.dependsOn.value)
      ? f.dependsOn.value.includes(current)
      : current === f.dependsOn.value;
  };
  const requiredFields = activeSchema.filter((f) => f.required && isFieldVisible(f));
  const filledRequiredFields = requiredFields.filter((f) => {
    const val = (formValues as any)[f.name];
    return (
      val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)
    );
  });
  const progress =
    requiredFields.length > 0 ? (filledRequiredFields.length / requiredFields.length) * 100 : 0;

  const renderField = (field: FieldSchema, isTemp: boolean = false) => {
    // Check dependency (shared helper — scalar or any-of-array match)
    if (!isFieldVisible(field)) {
      return null;
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
                <DateTimePicker
                  mode="date"
                  value={(value as string) || ''}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  error={!!error}
                />
              );
            case 'datetime':
              return (
                <DateTimePicker
                  mode="datetime"
                  value={(value as string) || ''}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  error={!!error}
                />
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
              const maxFiles = field.maxFiles ?? 5;
              const uploadNoun = field.allowPdf ? 'files' : 'photos';
              const formatHint = field.allowPdf ? 'JPG, PNG, PDF' : 'JPG, PNG';
              return (
                <div className="flex flex-col gap-1">
                  <div
                    onClick={() => !isUploading && fileInputRefs.current[field.name]?.click()}
                    className={`bg-white border-2 border-dashed rounded-2xl p-[32px_20px] flex flex-col items-center gap-2.5 ${isUploading ? 'cursor-not-allowed opacity-60 border-slate-300' : 'cursor-pointer border-[rgba(201,151,58,0.35)]'}`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-[#C9973A] animate-spin" />
                    ) : (
                      <ImagePlus className="w-8 h-8 text-[#C9973A]" />
                    )}
                    <div className="text-center">
                      <p className="font-sans text-[14px] font-medium text-[#1a1a2e]">
                        {isUploading ? 'Uploading...' : `Tap to upload ${uploadNoun}`}
                      </p>
                      <p className="font-sans text-[11px] text-[#94a3b8]">
                        Up to {maxFiles} {uploadNoun} • {formatHint}
                      </p>
                    </div>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[field.name] = el;
                      }}
                      type="file"
                      accept={field.allowPdf ? 'image/*,application/pdf' : 'image/*'}
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
                          {isSecureFileUrl(url) ? (
                            <SecureFile
                              url={url}
                              alt={`${field.label} ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={url}
                              alt={`Upload ${idx}`}
                              className="w-full h-full object-cover"
                              onError={() => {
                                console.error('Image load error:', url);
                              }}
                            />
                          )}
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
    const selectedCount = Object.keys(selectedItems).length;
    return (
      <div className="w-full min-h-screen bg-[#f5f2ed]">
        {/* Catalog Header */}
        {/* Opaque, no backdrop-blur: blur on sticky strips ghosts on budget Android GPUs. */}
        <div className="sticky top-0 z-30 bg-[#f5f2ed] border-b border-[#1B3068]/5">
          <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 py-5 sm:py-7 flex items-center gap-4">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setView('form')}
              className="w-10 h-10 -ml-2 flex items-center justify-center text-[#1a1a2e] rounded-full hover:bg-white/60 transition-colors"
              aria-label="Back to inquiry"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
                Item Catalog
              </p>
              <h2 className="font-serif text-[22px] sm:text-[28px] font-bold text-[#1a1a2e] leading-tight mt-1">
                Build your event toolkit
              </h2>
              <p className="hidden sm:block text-[13px] text-[#64748b] mt-1.5">
                Pick the equipment you need — providers will quote based on your selection.
              </p>
            </div>
            {selectedCount > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#C9973A]/25 shadow-sm">
                <ShoppingBasket className="w-4 h-4 text-[#C9973A]" />
                <span className="text-[13px] font-bold text-[#1a1a2e]">
                  {selectedCount} selected
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-32">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {RENTAL_CATALOG_ITEMS.map((item) => {
              const isSelected = !!selectedItems[item.id];
              const quantity = selectedItems[item.id]?.quantity || 0;

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setCurrentDetailItem(item);
                    setTempItemData(selectedItems[item.id] || {});
                  }}
                  className={`relative bg-white rounded-3xl overflow-hidden flex flex-col text-left group transition-all duration-300 ${
                    isSelected
                      ? 'ring-2 ring-[#C9973A] shadow-xl shadow-[#C9973A]/15'
                      : 'shadow-sm border border-[#1B3068]/5 hover:shadow-xl hover:shadow-[#1B3068]/10 hover:-translate-y-1'
                  }`}
                >
                  <div className="aspect-[4/5] sm:aspect-square overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {isSelected && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9973A] text-white shadow-lg z-10">
                        <Check className="w-3.5 h-3.5" />
                        <span className="font-bold text-[12px]">
                          {quantity > 1 ? `${quantity}` : 'Selected'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex flex-col gap-1">
                    <p className="font-serif text-[16px] sm:text-[18px] font-bold text-[#1a1a2e]">
                      {item.name}
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-[#64748b]">
                      {isSelected ? 'Tap to edit specifications' : 'Tap to specify'}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Sticky Review Bar */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1B3068]/8 z-[120] shadow-[0_-4px_24px_rgba(27,48,104,0.08)]"
            >
              <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#C9973A]/10 flex items-center justify-center">
                    <ShoppingBasket className="w-5 h-5 text-[#C9973A]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#1a1a2e]">
                      {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                    </p>
                    <p className="text-[11px] text-[#64748b]">Ready to return to your request</p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setView('form')}
                  className="bg-[#1a1a2e] text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-sans text-[14px] sm:text-[15px] font-semibold flex items-center gap-2 shadow-lg hover:bg-black transition-colors"
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
                className="relative w-full max-w-[640px] bg-white rounded-t-4xl sm:rounded-4xl shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Hero image header */}
                <div className="relative h-32 sm:h-40 overflow-hidden flex-shrink-0">
                  <img
                    src={currentDetailItem.image}
                    alt={currentDetailItem.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                  <button
                    type="button"
                    onClick={() => setCurrentDetailItem(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-[#1a1a2e] shadow-lg hover:bg-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-6 right-16">
                    <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
                      Specify your requirements
                    </p>
                    <h3 className="font-serif text-[22px] sm:text-[26px] font-bold text-white leading-tight mt-1">
                      {currentDetailItem.name}
                    </h3>
                  </div>
                </div>

                <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto flex flex-col gap-6">
                  {currentDetailItem.schema.map((field) => (
                    <div key={field.name}>{renderField(field, true)}</div>
                  ))}
                </div>

                <div className="p-5 sm:p-6 bg-[#f8fafc] flex gap-3 border-t border-[#f1f5f9]">
                  {selectedItems[currentDetailItem.id] && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItems((prev) => {
                          const next = { ...prev };
                          delete next[currentDetailItem.id];
                          return next;
                        });
                        setCurrentDetailItem(null);
                      }}
                      className="flex-1 h-13.5 border border-brand-error text-[#ef4444] rounded-[50px] font-sans text-[15px] font-semibold hover:bg-brand-error/5 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
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
                    className="flex-[2] h-13.5 bg-[#C9973A] rounded-[50px] font-sans text-[15px] font-semibold text-white shadow-lg hover:bg-[#b88532] transition-colors"
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
      <div className="md:hidden sticky top-0 z-30 px-0 pt-4 pb-5 bg-[#f5f2ed]">
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

      <form onSubmit={handleSubmit(onFormSubmit)} className="px-0 py-4 md:p-8 lg:p-10 xl:p-12">
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
                    ProQuote Tip
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
            <div className="bg-white border border-[#e8e0d0]/60 rounded-[28px] p-4 sm:p-6 md:p-10 xl:p-12 shadow-[0_4px_24px_-8px_rgba(26,26,46,0.08)]">
              {/* Two-column max — forms read better when each field has
                  real horizontal room. Going wider (3-4 columns) makes
                  labels feel cramped and bureaucratic; capped at 2 the
                  page feels deliberate and high-end. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-7 md:gap-y-9">
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
                      field.type === 'date' ||
                      field.type === 'datetime' ||
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
                  <div key={`group-${groupName}-${gIdx}`} className="col-span-full">
                    {/* Section header — deliberate visual weight. The
                        previous thin underline read as tentative; a
                        gold accent bar + serif-style framing tells the
                        user "this is its own concern" without shouting. */}
                    <div className="relative mt-8 mb-9 pb-5 border-b border-[#e8e0d0]/70">
                      <div className="absolute left-0 top-0 bottom-5 w-[3px] rounded-full bg-[#C9973A]" />
                      <div className="pl-5">
                        <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[#C9973A] font-bold mb-1.5">
                          Section
                        </p>
                        <h3 className="font-serif text-[20px] md:text-[22px] font-bold text-[#1a1a2e] leading-tight">
                          {groupName}
                        </h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-7 md:gap-y-9">
                      {fields.map((field, fIdx) => (
                        <div
                          key={field.name || `group-field-${fIdx}`}
                          className={
                            field.type === 'textarea' ||
                            field.type === 'image_upload' ||
                            field.type === 'multiselect' ||
                            field.type === 'date' ||
                            field.type === 'datetime' ||
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
                ))}
              </div>

              {/* Selected Items Summary Section */}
              {isEquipmentRental && (
                <div className="mt-12 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-[18px] font-bold text-[#1a1a2e]">
                        Equipment Items
                      </h3>
                      <p className="text-[12px] text-[#94a3b8] mt-1">
                        Pick what you need from the catalog
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setView('catalog')}
                      className="bg-[#1a1a2e] text-white px-4 py-2.5 rounded-full font-sans text-[13px] font-semibold flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Browse Catalog
                    </motion.button>
                  </div>

                  {Object.keys(selectedItems).length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setView('catalog')}
                      className={`w-full rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 transition-colors ${
                        itemsError
                          ? 'border-brand-error/60 bg-brand-error/5'
                          : 'border-[#e2e8f0] bg-white hover:border-[#C9973A]/60 hover:bg-[#C9973A]/5'
                      }`}
                    >
                      <ShoppingBasket className="w-8 h-8 text-[#C9973A]" />
                      <p className="font-serif text-[15px] font-bold text-[#1a1a2e]">
                        No items selected yet
                      </p>
                      <p className="text-[12px] text-[#94a3b8]">
                        Tap to browse chairs, tables, tents, catering, decor
                      </p>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {Object.entries(selectedItems).map(([itemId, itemData]) => {
                        const catalogItem = RENTAL_CATALOG_ITEMS.find((i) => i.id === itemId);
                        if (!catalogItem) return null;
                        const summaryParts = catalogItem.schema
                          .map((f) => itemData[f.name])
                          .filter((v) => v !== undefined && v !== null && v !== '')
                          .map(String);
                        return (
                          <div
                            key={itemId}
                            className="bg-white rounded-2xl border border-[#f1f5f9] p-4 flex items-center gap-3"
                          >
                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                              <img
                                src={catalogItem.image}
                                alt={catalogItem.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-serif text-[15px] font-bold text-[#1a1a2e]">
                                {catalogItem.name}
                              </p>
                              <p className="text-[12px] text-[#94a3b8] truncate">
                                {summaryParts.join(' · ') || 'Tap edit to specify'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentDetailItem(catalogItem);
                                setTempItemData(itemData);
                              }}
                              className="text-[12px] font-semibold text-[#1a1a2e] px-3 py-2 rounded-full bg-[#f8fafc] hover:bg-[#f1f5f9]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItems((prev) => {
                                  const next = { ...prev };
                                  delete next[itemId];
                                  return next;
                                });
                              }}
                              className="w-8 h-8 rounded-full bg-[#f8fafc] hover:bg-brand-error/10 flex items-center justify-center text-[#94a3b8] hover:text-brand-error"
                              aria-label={`Remove ${catalogItem.name}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {itemsError && (
                    <div className="flex items-center gap-2 text-brand-error text-[13px] font-medium">
                      <AlertCircle className="w-4 h-4" />
                      <span>{itemsError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Clinical either/or error — the equipment-rental block above
                  owns the shared itemsError render, but it never mounts for
                  clinical categories, so surface it here instead. */}
              {isClinical && itemsError && (
                <div className="flex items-center gap-2 text-brand-error text-[13px] font-medium mt-6">
                  <AlertCircle className="w-4 h-4" />
                  <span>{itemsError}</span>
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
