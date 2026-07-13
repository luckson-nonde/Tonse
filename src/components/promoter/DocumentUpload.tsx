import React, { useRef, useState } from 'react';
import { FileUp, Check } from 'lucide-react';
import { compressImage } from '../../utils/compressImage';

/**
 * ID-document picker: file input → compressImage (multi-MB phone photos
 * shrink ~10x) → base64 data URL handed to the parent. Same storage
 * convention as the registration flow's NRC document.
 */
export default function DocumentUpload({
  value,
  onChange,
  label = 'ID document',
  hint = 'NRC, passport or driving licence — photo or scan',
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      onChange(dataUrl);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#C9973A]/35 bg-white">
          <img
            src={value}
            alt=""
            className="w-12 h-12 rounded-xl object-cover ring-1 ring-[#C9973A]/20 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 mb-0.5 flex items-center gap-1.5">
              <Check className="w-3 h-3" strokeWidth={3} /> {label} attached
            </p>
            <p className="text-[12px] font-medium text-[#1a1612]/60 leading-tight truncate">{hint}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] hover:text-[#B08432] transition-colors shrink-0"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#e8e4dc] bg-white hover:border-[#C9973A]/45 disabled:opacity-60 transition-all text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
            <FileUp className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1a1612] leading-tight">
              {busy ? 'Processing…' : `Upload ${label.toLowerCase()}`}
            </p>
            <p className="text-[11px] text-[#1a1612]/55 mt-0.5 leading-snug">{hint}</p>
          </div>
        </button>
      )}
    </>
  );
}
