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
  children
}: DynamicProfileFormProps) {
  const allFields = schema.sections.flatMap(s => s.fields || []).filter(Boolean);
  const zodSchema = generateZodSchema(allFields);
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData
  });

  const handleImageUpload = (name: string, file: File | null, onChange: (val: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGetLocation = (onChange: (val: any) => void) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Failed to get location. Please ensure GPS is enabled.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const renderField = (field: any) => {
    if (!field || typeof field !== 'object' || !('type' in field)) {
      return null;
    }
    const fieldName = field.name || field.id;
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
                  <div className={`flex items-center bg-[#fffef9] border-[1.5px] rounded-[16px] px-4 py-3 transition-all duration-200 focus-within:border-[#C9973A]/50 ${error ? 'border-[#ef4444]' : 'border-[#e8e0d0]'}`}>
                    <input
                      type={field.type}
                      value={(value as string | number) || ''}
                      onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-transparent border-none outline-none font-sans text-[14px] text-[#1e293b] placeholder:text-[#94a3b8]"
                    />
                  </div>
                );
              case 'select':
                return (
                  <CustomDropdown
                    options={field.options?.map((opt: string) => ({ value: opt, label: opt })) || []}
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
                            ? selectedValues.filter(v => v !== opt)
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
                    <span className="text-[14px] font-sans text-[#1e293b]">{value ? 'Yes' : 'No'}</span>
                  </div>
                );
              case 'date':
                return (
                  <div className={`flex items-center bg-[#fffef9] border-[1.5px] rounded-[16px] px-4 py-3 transition-all duration-200 focus-within:border-[#C9973A]/50 ${error ? 'border-[#ef4444]' : 'border-[#e8e0d0]'}`}>
                    <input
                      type="date"
                      value={(value as string) || ''}
                      onChange={(e) => onChange(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none font-sans text-[14px] text-[#1e293b]"
                    />
                    <CalendarDays className="w-[18px] h-[18px] text-[#C9973A] pointer-events-none" />
                  </div>
                );
              case 'image_upload':
                return (
                  <div className="space-y-2">
                    <div className="relative group">
                      <div 
                        onClick={() => document.getElementById(`file-input-${field.name}`)?.click()}
                        className="w-full h-32 rounded-[16px] bg-[#fffef9] border-2 border-dashed border-[#e8e0d0] flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-[#C9973A]/30 cursor-pointer"
                      >
                        {value ? (
                          <img src={value as string} alt={field.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-slate-300 mb-2" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Click to upload</span>
                          </>
                        )}
                        <input
                          id={`file-input-${field.name}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(field.name, e.target.files?.[0] || null, onChange)}
                          className="hidden"
                        />
                      </div>
                      {value && (
                        <button 
                          type="button"
                          onClick={() => onChange('')}
                          className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {field.helpText && <p className="text-[11px] text-[#9ca3af] italic">{field.helpText}</p>}
                  </div>
                );
              case 'gps':
                return (
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between gap-4 p-4 bg-[#fffef9] border-[1.5px] border-[#e8e0d0] rounded-[16px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#C9973A]/10 rounded-xl flex items-center justify-center text-[#C9973A]">
                          <Navigation className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-sans font-bold text-[#1e293b]">GPS Coordinates</p>
                          <p className="text-[11px] font-sans text-[#9ca3af]">
                            {(value as any)?.latitude ? `${(value as any).latitude.toFixed(6)}, ${(value as any).longitude.toFixed(6)}` : 'No coordinates set'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGetLocation(onChange)}
                        className="px-4 py-2 bg-[#1e293b] text-white rounded-full text-[12px] font-sans font-medium hover:bg-black transition-colors flex items-center gap-2"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Get Current Location
                      </button>
                    </div>
                    
                    {(value as any)?.latitude && (
                      <div className="aspect-video rounded-[16px] overflow-hidden border border-[#e8e0d0]">
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
                return null;
            }
          }}
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[11px] font-medium text-[#ef4444] mt-1 flex items-center gap-1"
            >
              <AlertCircle className="w-[12px] h-[12px]" />
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
          <div key={sIdx} className="space-y-6 p-6 rounded-[24px] border border-[#e8e0d0]/50 bg-[#fcfcfc]/50">
            <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
              <h3 className="text-[18px] font-serif font-bold text-[#1e293b]">
                {section.sectionHeader || section.title}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {section.fields?.map((field, fIdx) => {
                if (!field) return null;
                const fieldName = (field as any).name || (field as any).id;
                return (
                  <div key={fieldName || fIdx} className={`${field?.type === 'gps' ? 'md:col-span-2' : ''}`}>
                    {renderField(field)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="pt-4">
        {children}
      </div>
    </form>
  );
}
