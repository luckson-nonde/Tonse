import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Play, X, ExternalLink, Loader2 } from 'lucide-react';
import {
  fetchUserPortfolio,
  extractYouTubeId,
  youTubeEmbedUrl,
  youTubeThumbnailUrl,
  type PortfolioItem,
} from '../services/api/portfolioService';

interface Props {
  /** The provider whose portfolio should be shown — usually
   *  `quote.providerId` (or a profile owner's id). */
  providerId: string | null | undefined;
  /** Optional heading override; defaults to "Past performances". */
  heading?: string;
  /** Optional subhead override. */
  subhead?: string;
  /** When true, render nothing while loading instead of a skeleton.
   *  Useful when the showcase is embedded inline and a flicker is worse
   *  than a slightly delayed appearance. */
  hideWhileLoading?: boolean;
}

/**
 * Read-only gallery of a provider's YouTube performances. Embedded into
 * QuoteDetails so a buyer reviewing a quote can immediately see what the
 * artist actually does, without leaving the quote view. Clicking a card
 * opens an inline preview modal that autoplays the embed.
 *
 * Renders nothing if the provider has no portfolio items — quotes from
 * providers who haven't published anything stay clean.
 */
export default function PortfolioShowcase({
  providerId,
  heading = 'Past performances',
  subhead = 'Tap to play. Embedded from YouTube as proof of work.',
  hideWhileLoading = false,
}: Props) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchUserPortfolio(providerId)
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch((err) => { if (!cancelled) setError(err?.message || null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [providerId]);

  if (loading) {
    if (hideWhileLoading) return null;
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading performances…
      </div>
    );
  }

  // Quietly hide on error or when there's nothing to show — this is
  // supplementary content, not blocking.
  if (error || items.length === 0) return null;

  return (
    <>
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#f5f2ed] text-[#c9973a] flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-brand-dark text-lg tracking-tight truncate">
                {heading}
              </h3>
              <p className="text-[12px] text-slate-500 mt-0.5">{subhead}</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c9973a] bg-[#c9973a]/10 px-2 py-1 rounded-md flex-shrink-0">
            {items.length} {items.length === 1 ? 'clip' : 'clips'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {items.map((item) => {
            const videoId = extractYouTubeId(item.youtubeUrl);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreviewing(item)}
                className="text-left bg-[#f5f2ed] rounded-2xl overflow-hidden border border-slate-200 hover:border-[#c9973a]/50 hover:shadow-md transition-all group"
                aria-label={`Play ${item.title}`}
              >
                <div className="aspect-video bg-black relative overflow-hidden">
                  {videoId ? (
                    <img
                      src={youTubeThumbnailUrl(videoId)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Music className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/95 text-[#c9973a] flex items-center justify-center shadow-md scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-brand-dark text-[13px] leading-tight line-clamp-2 tracking-tight">
                    {item.title}
                  </h4>
                  {(item.eventName || item.eventDate) && (
                    <p className="mt-1 text-[10.5px] text-slate-500 truncate">
                      {[item.eventName, formatEventDate(item.eventDate)].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {previewing && (
          <PreviewModal item={previewing} onClose={() => setPreviewing(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

function PreviewModal({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  const videoId = extractYouTubeId(item.youtubeUrl);
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-start justify-between px-5 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-bold text-brand-dark text-[15px] truncate">{item.title}</h3>
            {(item.eventName || item.eventDate) && (
              <p className="text-[11px] text-slate-500 truncate">
                {[item.eventName, formatEventDate(item.eventDate)].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={item.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold uppercase tracking-wider text-[#c9973a] hover:underline inline-flex items-center gap-1 px-2"
            >
              YouTube <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 hover:bg-[#f5f2ed] rounded-full text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="aspect-video bg-black">
          {videoId ? (
            <iframe
              src={youTubeEmbedUrl(videoId) + '&autoplay=1'}
              title={item.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm">
              Couldn&apos;t parse a YouTube ID from this URL.
            </div>
          )}
        </div>
        {item.description && (
          <p className="px-5 py-3 text-[13px] text-slate-600 leading-relaxed border-t border-slate-100">
            {item.description}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function formatEventDate(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[parseInt(m[2], 10) - 1] ?? '';
  return `${month} ${parseInt(m[3], 10)}, ${m[1]}`;
}
