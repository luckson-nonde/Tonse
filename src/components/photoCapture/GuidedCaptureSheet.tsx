import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Check, Images, Loader2, ShieldCheck, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { compressImage } from '../../utils/compressImage';
import GuideOutline, { type GuideKind } from './guideSvgs';

interface GuidedCaptureSheetProps {
  open: boolean;
  /** Outline the buyer lines up to (`inspo` for the inspiration slot). */
  guideKind: GuideKind;
  /** `user` = front camera (faces), `environment` = rear (hands, hair, feet). */
  cameraFacing: 'user' | 'environment';
  title: string;
  lede: string;
  tips: string[];
  /** Only the buyer's own photo carries the retention note. */
  showPrivacyNote?: boolean;
  /** Receives the already-compressed file the buyer approved. */
  onConfirm: (file: File) => void;
  onClose: () => void;
}

const formatBytes = (b: number) =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

/**
 * The coached capture flow: line up to an outline → shoot → check the framing
 * against that same outline → keep or retake.
 *
 * Capture uses two hidden file inputs rather than getUserMedia. The web has no
 * OS action sheet, so a `capture`-flagged input (camera) beside a plain one
 * (gallery) is the idiom that works everywhere — no permission prompt, no
 * live-video fallbacks, and the gallery path still works on desktop where
 * `capture` is ignored. Same approach as NrcDocumentCapture.
 */
export default function GuidedCaptureSheet({
  open,
  guideKind,
  cameraFacing,
  title,
  lede,
  tips,
  showPrivacyNote = false,
  onConfirm,
  onClose,
}: GuidedCaptureSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // The shot awaiting approval. Held here (not lifted) so "Retake" never
  // touches the form — nothing is committed until the buyer confirms.
  const [pending, setPending] = useState<{ file: File; url: string; before: number } | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  useFocusTrap(open, panelRef, { onEscape: onClose });

  // Lock the page behind the sheet (same effect as ConsentModal).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Drop any half-finished capture when the sheet closes, and release the
  // object URL so a long form session doesn't leak blobs.
  useEffect(() => {
    if (open) return;
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setIsPreparing(false);
    setReadError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }, [open]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);
    setIsPreparing(true);
    try {
      const compressed = await compressImage(file);
      setPending((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { file: compressed, url: URL.createObjectURL(compressed), before: file.size };
      });
    } catch {
      setReadError("That photo couldn't be read. Try another one.");
    } finally {
      setIsPreparing(false);
    }
  };

  const retake = () => {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const confirm = () => {
    if (!pending) return;
    onConfirm(pending.file);
    onClose();
  };

  const isInspiration = guideKind === 'inspo';
  // Body-part shots come off the camera; inspiration is nearly always a
  // screenshot already on the phone, so the buttons swap emphasis.
  const primaryIsCamera = !isInspiration;

  const sheet = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(20, 37, 80, 0.34)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          {/* opacity + y together: MotionConfig strips transforms on touch
              devices, so phones still get a clean fade instead of a pop. */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-[520px] max-h-[94vh] overflow-y-auto bg-[#fffaf5] rounded-t-[22px] sm:rounded-[22px] border-t border-[#e8e0d0] sm:border px-5 pt-4 pb-6 sm:px-7 sm:pt-6 sm:pb-7 pb-safe"
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#d9d2c4] sm:hidden" aria-hidden="true" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-[19px] font-bold text-[#1a1a2e] leading-tight">{title}</h2>
                <p className="mt-1 text-[13px] text-[#8a94a6]">{lede}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 shrink-0 rounded-full bg-white border border-[#e8e0d0] flex items-center justify-center text-[#1a1a2e] hover:border-[#C9973A] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stage: the outline, with the captured photo behind it once taken
                — this is where the buyer checks their own framing. */}
            <div className="relative mx-auto mt-4 w-full max-w-[280px] aspect-[3/4] rounded-2xl border border-[#e8e0d0] bg-[#f7f5f1] overflow-hidden">
              {pending && (
                <img src={pending.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <GuideOutline
                kind={guideKind}
                opacity={pending ? 0.6 : 1}
                className="absolute inset-0 w-full h-full"
              />
              {isPreparing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="w-6 h-6 text-[#C9973A] animate-spin" />
                </div>
              )}
            </div>

            {pending ? (
              <p className="mt-3 text-center text-[12px] font-semibold text-[#2F7D5B]">
                Ready to send as {formatBytes(pending.file.size)}
                {pending.before > pending.file.size && ` (was ${formatBytes(pending.before)})`}
              </p>
            ) : (
              <ul className="mt-4 space-y-1.5">
                {tips.map((tip) => (
                  <li key={tip} className="flex gap-2.5 text-[13px] text-[#4A5063]">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9973A]" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}

            {readError && <p className="mt-3 text-center text-[12px] font-medium text-[#B4442F]">{readError}</p>}

            {!pending && showPrivacyNote && (
              <div className="mt-4 flex gap-2.5 rounded-xl bg-[#f7f5f1] px-3.5 py-3 text-[12px] text-[#4A5063]">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#8a94a6] mt-px" />
                <span>Only the providers you send this request to can see your photos.</span>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              {pending ? (
                <>
                  <button
                    type="button"
                    onClick={confirm}
                    className="min-h-13 rounded-full bg-[#1a1a2e] text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Check className="w-4 h-4" />
                    Use this photo
                  </button>
                  <button
                    type="button"
                    onClick={retake}
                    className="min-h-13 rounded-full bg-white border border-[#1a1a2e] text-[#1a1a2e] font-semibold text-[15px] flex items-center justify-center gap-2"
                  >
                    Retake
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isPreparing}
                    onClick={() =>
                      (primaryIsCamera ? cameraInputRef : galleryInputRef).current?.click()
                    }
                    className="min-h-13 rounded-full bg-[#1a1a2e] text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
                  >
                    {primaryIsCamera ? <Camera className="w-4 h-4" /> : <Images className="w-4 h-4" />}
                    {primaryIsCamera ? 'Take photo' : 'Choose from gallery'}
                  </button>
                  <button
                    type="button"
                    disabled={isPreparing}
                    onClick={() =>
                      (primaryIsCamera ? galleryInputRef : cameraInputRef).current?.click()
                    }
                    className="min-h-13 rounded-full bg-white border border-[#1a1a2e] text-[#1a1a2e] font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {primaryIsCamera ? <Images className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    {primaryIsCamera ? 'Choose from gallery' : 'Take photo'}
                  </button>
                </>
              )}
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture={cameraFacing}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(sheet, document.body);
}
