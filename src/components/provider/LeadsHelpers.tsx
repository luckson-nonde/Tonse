import React, { useState } from 'react';
import { X, Play, ZoomIn } from 'lucide-react';

// ─── Preference tag formatter ─────────────────────────────────────────────────

const PREF_KEY_MAP: Record<string, string> = {
  destination: 'Destination',
  targetoption: 'Target',
  validity: 'Valid For',
  maxquotes: 'Max Quotes',
  quoteparameter: 'Quote Parameter',
  leadtime: 'Lead Time',
  condition: 'Condition',
  urgency: 'Urgency',
  brand: 'Brand',
};

const toTitleCase = (str: string) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

const formatPrefKey = (raw: string): string =>
  PREF_KEY_MAP[raw.toLowerCase()] ?? toTitleCase(raw.replace(/_/g, ' '));

const formatPrefValue = (raw: string): string => {
  const lower = raw.toLowerCase();
  // Strip numeric suffixes that are already in the value and title-case
  return toTitleCase(raw.replace(/_/g, ' '));
};

export function PreferenceTags({
  preferences,
}: {
  preferences: Record<string, any>;
}) {
  const entries = Object.entries(preferences).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex flex-col gap-0.5"
        >
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
            {formatPrefKey(key)}
          </span>
          <span className="text-sm font-black text-slate-900">
            {formatPrefValue(String(value))}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

interface LightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(startIndex);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={images[current]}
        alt={`Photo ${current + 1}`}
        className="max-w-full max-h-[85vh] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Thumbnail Grid ───────────────────────────────────────────────────────────

interface ThumbnailGridProps {
  images: string[];
  maxVisible?: number;
  size?: number;   // px
  compact?: boolean; // stacked vertically (for center zone)
}

export function ThumbnailGrid({
  images,
  maxVisible = 6,
  size = 80,
  compact = false,
  columns = 1,
}: ThumbnailGridProps & { columns?: number }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const visible = images.slice(0, maxVisible);
  const overflow = images.length - maxVisible;

  const isVideo = (src: string) =>
    /\.(mp4|webm|mov|avi)$/i.test(src);

  return (
    <>
      <div className={compact ? `grid gap-3` : 'flex flex-wrap gap-2'} style={compact ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : {}}>
        {visible.map((src, i) => {
          const isLast = i === visible.length - 1 && overflow > 0;
          return (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#d49b35]/50 transition-all group aspect-square w-full"
              style={!compact ? { width: size, height: size } : {}}
            >
              {isVideo(src) ? (
                <>
                  <video src={src} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </>
              ) : (
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              )}
              {isLast && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+{overflow}</span>
                </div>
              )}
              {!isLast && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {lightboxIdx !== null && (
        <Lightbox images={images} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}
