import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Camera, X, CalendarDays, Navigation, Loader2 } from 'lucide-react';
import { ProfileSchema } from '../services/userSchemas';
import { generateZodSchema } from '../services/schemaGenerator';
import CustomDropdown from './CustomDropdown';

interface DynamicProfileFormProps {
  schema: ProfileSchema;
  initialData: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
  children?: React.ReactNode;
}

export default function DynamicProfileForm({
  schema,
  initialData,
  onSubmit,
  isSubmitting,
  children,
}: DynamicProfileFormProps) {
  const allFields = schema.sections.flatMap((s) => s.fields || []).filter(Boolean);
  const zodSchema = generateZodSchema(allFields);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData,
  });

  const handleImageUpload = (name: string, file: File | null, onChange: (val: string) => void) => {
    if (!file) return;

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert('Image is too large. Please choose an image smaller than 2MB.');
      return;
    }

    // Create image for compression
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if image is too large (max 1200px width)
        const maxWidth = 1200;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to WebP or JPEG with compression
          const compressedData = canvas.toDataURL('image/jpeg', 0.75); // 75% quality
          onChange(compressedData);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleGetLocation = (onChange: (val: any) => void) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get location. Please ensure GPS is enabled.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const formatNRC = (value: string) => {
    // Remove all non-digits and slashes
    const cleaned = value.replace(/[^\d/]/g, '');

    // Format as 000000/00/0
    const match = cleaned.match(/^(\d{0,6})?(\d{0,2})?(\d{0,1})?$/);
    if (match) {
      let formatted = match[1] || '';
      if (match[2]) formatted += '/' + match[2];
      if (match[3]) formatted += '/' + match[3];
      return formatted;
    }
    return value;
  };

  const renderField = (field: any) => {
    if (!field || typeof field !== 'object' || !('type' in field)) {
      return null;
    }
    const fieldName = field.name || field.id;
    if (!fieldName) {
      console.warn('Field is missing name or id:', field);
      return null;
    }
    const error = errors[fieldName]?.message as string | undefined;

    return (
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-[#C9973A]">✦</span>}
        </label>

        <Controller
          name={fieldName}
          control={control}
          render={({ field: rhfField }) => {
            const { onChange, value } = rhfField;
            switch (field.type) {
              case 'text':
              case 'email':
              case 'tel':
              case 'number':
                return (
                  <div
                    className={`flex items-center bg-[#fffef9] border-[1.5px] rounded-2xl px-4 py-3 transition-all duration-200 focus-within:border-[#C9973A]/50 ${error ? 'border-brand-error' : 'border-[#e8e0d0]'}`}
                  >
                    <input
                      type={field.type}
                      value={(value as string | number) || ''}
                      onChange={(e) => {
                        let inputValue = e.target.value;
                        // Apply NRC formatting if this is an NRC field
                        if (field.name === 'nrc') {
                          inputValue = formatNRC(inputValue);
                        }
                        onChange(field.type === 'number' ? Number(inputValue) : inputValue);
                      }}
                      placeholder={field.placeholder}
                      maxLength={field.name === 'nrc' ? 12 : undefined} // NRC format is 000000/00/0 = 12 chars
                      className="w-full bg-transparent border-none outline-none font-sans text-sm text-brand-dark placeholder:text-slate-400"
                    />
                  </div>
                );
              case 'select':
                return (
                  <CustomDropdown
                    options={
                      field.options?.map((opt: string) => ({ value: opt, label: opt })) || []
                    }
                    value={String(value || '')}
                    onChange={onChange}
                    placeholder={field.placeholder || `Select ${field.label}`}
                  />
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
              case 'boolean':
              case 'toggle':
                return (
                  <div className="flex items-center gap-3 py-2">
                    <button
                      type="button"
                      onClick={() => onChange(!value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9973A] focus:ring-offset-2 ${
                        value ? 'bg-[#C9973A]' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm font-sans text-brand-dark">
                      {value ? 'Yes' : 'No'}
                    </span>
                  </div>
                );
              case 'date':
                return (
                  <div
                    className={`flex items-center bg-[#fffef9] border-[1.5px] rounded-2xl px-4 py-3 transition-all duration-200 focus-within:border-[#C9973A]/50 ${error ? 'border-brand-error' : 'border-[#e8e0d0]'}`}
                  >
                    <input
                      type="date"
                      value={(value as string) || ''}
                      onChange={(e) => onChange(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-brand-dark"
                    />
                    <CalendarDays className="w-4.5 h-4.5 text-[#C9973A] pointer-events-none" />
                  </div>
                );
              case 'image_upload':
                return (
                  <div className="space-y-2">
                    <div className="relative group">
                      <div
                        onClick={() => document.getElementById(`file-input-${field.name}`)?.click()}
                        className="w-full h-32 rounded-2xl bg-[#fffef9] border-2 border-dashed border-[#e8e0d0] flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-[#C9973A]/30 cursor-pointer"
                      >
                        {value && typeof value === 'string' ? (
                          <img
                            src={String(value)}
                            alt={field.label}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-slate-300 mb-2" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Click to upload or capture
                            </span>
                          </>
                        )}
                        <input
                          id={`file-input-${field.name}`}
                          type="file"
                          accept="image/*"
                          capture={
                            field.label?.toLowerCase().includes('camera')
                              ? 'environment'
                              : undefined
                          }
                          onChange={(e) =>
                            handleImageUpload(field.name, e.target.files?.[0] || null, onChange)
                          }
                          className="hidden"
                        />
                      </div>
                      {value && typeof value === 'string' ? (
                        <button
                          type="button"
                          onClick={() => onChange('')}
                          className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`file-input-${field.name}`)?.click()}
                        className="flex-1 px-3 py-2 bg-[#C9973A]/10 text-[#C9973A] rounded-lg font-medium hover:bg-[#C9973A]/20 transition-colors"
                      >
                        📁 Choose File
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById(`camera-input-${field.name}`)?.click()
                        }
                        className="flex-1 px-3 py-2 bg-[#C9973A]/10 text-[#C9973A] rounded-lg font-medium hover:bg-[#C9973A]/20 transition-colors"
                      >
                        📷 Take Photo
                      </button>
                      <input
                        id={`camera-input-${field.name}`}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) =>
                          handleImageUpload(field.name, e.target.files?.[0] || null, onChange)
                        }
                        className="hidden"
                      />
                    </div>
                    {field.helpText && (
                      <p className="text-[11px] text-[#9ca3af] italic">{field.helpText}</p>
                    )}
                  </div>
                );
              case 'gps':
                return (
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between gap-4 p-4 bg-[#fffef9] border-[1.5px] border-[#e8e0d0] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#C9973A]/10 rounded-xl flex items-center justify-center text-[#C9973A]">
                          <Navigation className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-sans font-bold text-brand-dark">
                            GPS Coordinates
                          </p>
                          <p className="text-[11px] font-sans text-[#9ca3af]">
                            {(value as any)?.latitude
                              ? `${(value as any).latitude.toFixed(6)}, ${(value as any).longitude.toFixed(6)}`
                              : 'No coordinates set'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGetLocation(onChange)}
                        className="px-4 py-2 bg-brand-dark text-white rounded-full text-xs font-sans font-medium hover:bg-black transition-colors flex items-center gap-2"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Get Current Location
                      </button>
                    </div>

                    {(value as any)?.latitude && (
                      <div className="aspect-video rounded-2xl overflow-hidden border border-[#e8e0d0]">
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://maps.google.com/maps?q=${(value as any).latitude},${(value as any).longitude}&hl=en&z=14&output=embed`}
                        ></iframe>
                      </div>
                    )}
                  </div>
                );
              default:
                console.warn(`Unsupported field type: ${field.type}`);
                return <></>;
            }
          }}
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[11px] font-medium text-brand-error mt-1 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <form id="dynamic-profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      {schema.sections.map((section, sIdx) => {
        if (!section) return null;
        return (
          <div
            key={sIdx}
            className="space-y-6 p-6 rounded-3xl border border-[#e8e0d0]/50 bg-[#fcfcfc]/50"
          >
            <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
              <h3 className="text-lg font-serif font-bold text-brand-dark">
                {section.sectionHeader || section.title}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {section.fields?.map((field, fIdx) => {
                if (!field) return null;
                const fieldName = (field as any).name || (field as any).id;
                return (
                  <div
                    key={fieldName || fIdx}
                    className={`${field?.type === 'gps' || field?.type === 'image_upload' ? 'md:col-span-2' : ''}`}
                  >
                    {renderField(field)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="pt-4">{children}</div>
    </form>
  );
}
