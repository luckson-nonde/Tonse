import React, { useRef, useState } from 'react';
import { Check, FileText, Upload, X, AlertCircle } from 'lucide-react';

interface NrcDocumentCaptureProps {
  /** Base64 data URL of the captured NRC document (or empty string). */
  value: string;
  onCapture: (imageData: string) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB ceiling on the original file
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/**
 * Compact NRC document upload control. The user picks (or photographs,
 * via the file input's `capture` attribute on mobile) a clear photo of
 * their NRC document. The file is read into a base64 data URL and
 * handed back through onCapture; the caller is responsible for piping
 * it to the registration endpoint, where it lands on
 * users.nrcDocumentPath.
 *
 * Visually mirrors CompactIdentityCapture so the two identity-step
 * controls feel like a pair.
 */
export default function NrcDocumentCapture({ value, onCapture }: NrcDocumentCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image of your NRC document.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large (max 5 MB). Try a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Couldn't read that file. Try another image.");
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        onCapture(result);
        setError(null);
      } else {
        setError("Couldn't read that file. Try another image.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {value ? (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#C9973A]/35 bg-white shadow-[0_4px_18px_-14px_rgba(201,151,58,0.5)]">
          <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-[#C9973A]/20 bg-[#faf6ee] shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 mb-0.5 flex items-center gap-1.5">
              <Check className="w-3 h-3" strokeWidth={3} /> NRC Document Attached
            </p>
            <p className="text-[12px] font-medium text-[#1a1612]/60 leading-tight">
              Admin will verify against your NRC number.
            </p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] hover:text-[#B08432] transition-colors shrink-0"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#e8e4dc] bg-brand-white hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-16px_rgba(26,22,18,0.15)] transition-all duration-200 text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1a1612] leading-tight">NRC document photo</p>
            <p className="text-[11px] text-[#1a1612]/55 mt-0.5">
              Upload a clear shot · matches your NRC number
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C9973A] shrink-0 flex items-center gap-1">
            <Upload className="w-3 h-3" strokeWidth={2.5} />
            Upload
          </span>
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 mt-2 px-1">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 mt-[2px]" strokeWidth={2} />
          <p className="text-[11px] text-rose-500/85 leading-snug">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="ml-auto text-rose-500/60 hover:text-rose-500 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        // `capture` lets phones offer the rear camera directly; desktops
        // ignore it and just open the file picker.
        capture="environment"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
    </>
  );
}
