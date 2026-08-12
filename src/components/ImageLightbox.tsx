import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/** Distance a touch must travel before it counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD_PX = 45;

export interface ImageLightboxProps {
  /** Every image in this catalog/gallery, in display order. */
  images: string[];
  /** Which one to open on. Clamped, so a stale index can't blank the viewer. */
  index: number;
  /** null/undefined `index` is NOT how you close — use `open`. */
  open: boolean;
  onClose: () => void;
  onIndexChange: (next: number) => void;
  /** Shown top-left, e.g. the product name. Optional. */
  title?: string;
}

/**
 * Full-screen image viewer for PRODUCT and SERVICE photography.
 *
 * The catalogue grids show thumbnails cropped square; that's right for
 * scanning but wrong for judging — a buyer deciding whether to hire a grader
 * needs to actually SEE it. Clicking any photo brings it into focus here:
 * whole image, uncropped, on a dark ground, with the rest of the same
 * catalogue one arrow-press or one swipe away.
 *
 * Deliberately NOT used for the job board / labour surfaces (those get their
 * own treatment) or for secure documents (they stream through SecureFile and
 * must never be handed to a plain <img>).
 *
 * Rendered through a portal at z-[9998]: above every page-level overlay
 * (including the pop-up advert at 280 and payment sheets at 300) because it
 * IS the user's current task, but still under the app's hard ceiling so a
 * subscription paywall can never be buried behind a photo.
 */
export default function ImageLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
  title,
}: ImageLightboxProps) {
  const count = images.length;
  const safeIndex = count > 0 ? Math.min(Math.max(index, 0), count - 1) : 0;
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      // Wrap: at the last photo, "next" returns to the first. A dead-end
      // arrow on a 3-photo gallery feels broken.
      onIndexChange((safeIndex + delta + count) % count);
    },
    [count, safeIndex, onIndexChange],
  );

  // Keyboard: the desktop half of "click through the catalog".
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, go]);

  // Lock the page behind the viewer — without this, a swipe on mobile scrolls
  // the shop page under the photo.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Re-arm the fade whenever the photo changes, so each one eases in rather
  // than popping half-decoded.
  useEffect(() => setLoaded(false), [safeIndex, open]);

  if (typeof document === 'undefined') return null;

  const src = images[safeIndex];

  return createPortal(
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9998] bg-[#0b0f19]/95 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} — photo viewer` : 'Photo viewer'}
          onClick={onClose}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const startX = touchStartX.current;
            touchStartX.current = null;
            if (startX === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
            if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
          }}
        >
          {/* ── Top bar ── */}
          <div
            className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              {title && (
                <p className="text-[13px] sm:text-sm font-bold truncate max-w-[60vw]">{title}</p>
              )}
              {count > 1 && (
                <p className="text-[11px] text-white/50 mt-0.5 tabular-nums">
                  {safeIndex + 1} of {count}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close photo viewer"
              className="shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Stage. Clicking the backdrop closes; clicking the photo
                 doesn't, so a mis-aimed tap never dumps you out. ── */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center px-3 sm:px-16 pb-3">
            <AnimatePresence mode="wait">
              <motion.img
                key={src}
                src={src}
                alt={title ? `${title} — photo ${safeIndex + 1}` : `Photo ${safeIndex + 1}`}
                referrerPolicy="no-referrer"
                onClick={(e) => e.stopPropagation()}
                onLoad={() => setLoaded(true)}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: loaded ? 1 : 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                /* object-contain, never cover: this view exists precisely so
                   nothing is cropped away. */
                className="max-w-full max-h-full object-contain rounded-lg select-none"
                draggable={false}
              />
            </AnimatePresence>

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Previous photo"
                  className="absolute left-1 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Next photo"
                  className="absolute right-1 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* ── Filmstrip: where you are in the catalogue, and a one-tap jump.
                 Hidden for a single photo, where it would be noise. ── */}
          {count > 1 && (
            <div
              className="relative z-10 px-4 sm:px-6 pb-5 pt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-start sm:justify-center">
                {images.map((thumb, i) => (
                  <button
                    key={`${thumb}-${i}`}
                    type="button"
                    onClick={() => onIndexChange(i)}
                    aria-label={`View photo ${i + 1}`}
                    aria-current={i === safeIndex}
                    /* Opaque border colours — translucent strokes on rounded
                       cards smear on Android Mali GPUs. */
                    className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      i === safeIndex
                        ? 'border-[#C9973A] opacity-100'
                        : 'border-[#2a3142] opacity-55 hover:opacity-90'
                    }`}
                  >
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * State plumbing for the common case: a grid of images where clicking one
 * opens the viewer at that index.
 *
 * ```tsx
 * const lightbox = useImageLightbox(galleryImages);
 * <img onClick={() => lightbox.openAt(i)} … />
 * <ImageLightbox {...lightbox.props} title={product.name} />
 * ```
 */
export function useImageLightbox(images: string[]) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return {
    openAt,
    close,
    isOpen: open,
    props: {
      images,
      index,
      open,
      onClose: close,
      onIndexChange: setIndex,
    } satisfies Omit<ImageLightboxProps, 'title'>,
  };
}
