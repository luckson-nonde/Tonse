import React, { useRef, useState } from 'react';
import { Check, FileText, Upload, X, AlertCircle } from 'lucide-react';
import { dataUrlMeta, formatBytes } from '../utils/fileMeta';

export interface NrcDocumentSides {
  front?: string;
  back?: string;
}

interface NrcDocumentCaptureProps {
  /** Captured base64 data URLs for each side. Empty / missing entries
   * mean that side hasn't been captured yet. */
  value: NrcDocumentSides;
  onCapture: (value: NrcDocumentSides) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB ceiling on the original file
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

type Side = 'front' | 'back';

/**
 * Two-side NRC document capture. Both sides are captured through the
 * same tile — clicking "Upload" picks whichever side hasn't been done
 * yet, the tile updates to show progress, and individual "Replace"
 * actions appear once a side has been captured.
 *
 * The upstream value is a structured { front, back } object; the
 * registration submit step serialises it before sending to the
 * backend.
 *
 * Visually mirrors CompactIdentityCapture so the two identity-step
 * controls feel like a pair.
 */
export default function NrcDocumentCapture({ value, onCapture }: NrcDocumentCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Which side the next file selection lands on. Defaults to whichever
  // side is still missing; explicitly settable via the per-side
  // "Replace" action so the user can re-shoot one side without
  // touching the other.
  const [pendingSide, setPendingSide] = useState<Side | null>(null);

  const hasFront = !!value.front;
  const hasBack = !!value.back;
  const completed = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);

  const nextSide = (): Side => (hasFront ? 'back' : 'front');

  const openPicker = (side?: Side) => {
    setError(null);
    setPendingSide(side ?? nextSide());
    // Reset value first so picking the same file twice still triggers
    // onChange (browsers de-dupe identical paths otherwise).
    if (inputRef.current) inputRef.current.value = '';
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
    const targetSide: Side = pendingSide ?? nextSide();
    const reader = new FileReader();
    reader.onerror = () => setError("Couldn't read that file. Try another image.");
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        onCapture({ ...value, [targetSide]: result });
        setError(null);
        setPendingSide(null);
      } else {
        setError("Couldn't read that file. Try another image.");
      }
    };
    reader.readAsDataURL(file);
  };

  const sideLabel = (side: Side) => (side === 'front' ? 'Front' : 'Back');

  const idleCopy =
    completed === 0
      ? {
          title: 'NRC document · Front',
          subtitle: 'Step 1 of 2 · a clear photo of the front',
          cta: 'Upload front',
        }
      : completed === 1 && hasFront
        ? {
            title: 'NRC document · Back',
            subtitle: 'Step 2 of 2 · now the back',
            cta: 'Upload back',
          }
        : {
            title: 'NRC document · Front',
            subtitle: 'Step 1 of 2 · a clear photo of the front',
            cta: 'Upload front',
          };

  // Rendered when at least one side is captured — shows thumbnails for
  // each side and per-side action (Replace if captured, Upload if missing).
  const SideThumb = ({ side, src }: { side: Side; src?: string }) => {
    const captured = !!src;
    const meta = dataUrlMeta(src);
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-2xl border bg-white ${
          captured
            ? 'border-[#C9973A]/35 shadow-[0_4px_14px_-12px_rgba(201,151,58,0.5)]'
            : 'border-[#e8e4dc]'
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl overflow-hidden ring-1 ${
            captured ? 'ring-[#C9973A]/20 bg-[#faf6ee]' : 'ring-[#e8e4dc] bg-[#f5f2ee]'
          } flex items-center justify-center shrink-0`}
        >
          {captured ? (
            <img src={src} alt="" className="w-full h-full object-cover" />
          ) : (
            <FileText className="w-5 h-5 text-[#C9973A]/50" strokeWidth={2} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-black uppercase tracking-[0.18em] mb-0.5 flex items-center gap-1.5 ${
              captured ? 'text-emerald-600' : 'text-[#1a1612]/45'
            }`}
          >
            {captured ? (
              <Check className="w-3 h-3" strokeWidth={3} />
            ) : (
              <span className="w-3 h-3 rounded-full border border-[#1a1612]/25" />
            )}
            {sideLabel(side)} {captured ? 'captured' : 'pending'}
          </p>
          <p className="text-[11px] text-[#1a1612]/55 leading-tight truncate">
            {captured ? (meta ? `${meta.label} · ${formatBytes(meta.bytes)}` : 'Uploaded') : 'Tap to upload'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openPicker(side)}
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] hover:text-[#B08432] transition-colors shrink-0"
        >
          {captured ? 'Replace' : 'Upload'}
        </button>
      </div>
    );
  };

  return (
    <>
      {completed === 0 ? (
        <button
          type="button"
          onClick={() => openPicker('front')}
          className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl border border-[#e8e4dc] bg-brand-white hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-16px_rgba(26,22,18,0.15)] active:scale-[0.99] transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-3 w-full sm:flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#1a1612] leading-tight">{idleCopy.title}</p>
              <p className="text-[11px] text-[#1a1612]/55 mt-0.5 leading-snug">{idleCopy.subtitle}</p>
            </div>
          </div>
          <span className="self-end sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#C9973A]/10 text-[10px] font-bold uppercase tracking-[0.16em] text-[#C9973A]">
            <Upload className="w-3 h-3" strokeWidth={2.5} />
            {idleCopy.cta}
          </span>
        </button>
      ) : (
        <div className="space-y-2">
          {/* Progress meter — gives the user a sense of "how far through" */}
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1a1612]/55">
              NRC Document
            </p>
            <p className="text-[10px] font-bold text-[#1a1612]/55 tabular-nums">
              {completed} of 2 captured
            </p>
          </div>
          <div className="h-1 rounded-full bg-[#f1ede5] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D5A547] to-[#C9973A] transition-all duration-300"
              style={{ width: `${(completed / 2) * 100}%` }}
            />
          </div>

          <SideThumb side="front" src={value.front} />
          <SideThumb side="back" src={value.back} />
        </div>
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
