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
  /** Provider whose catalog to render. */
  providerId: string;
  /** Used in the dialog title — typically the provider's name from the
   *  quote/profile context the buyer is browsing. */
  providerName?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Buyer-facing modal that fetches and shows a provider's full performance
 * catalog with embedded YouTube playback. Used from QuoteCard so a buyer
 * scanning their incoming quotes can preview an artist's past gigs
 * inline — without navigating into the full quote detail.
 */
export default function PortfolioModal({ providerId, providerName, isOpen, onClose }: Props) {
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    if (!isOpen || !providerId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchUserPortfolio(providerId)
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Could not load catalog.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, providerId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="relative w-full max-w-4xl bg-white rounded-t-[28px] sm:rounded-[28px] border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="px-6 sm:px-7 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#f5f2ed] text-[#c9973a] flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c9973a]">
                    Performance catalog
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold font-serif text-brand-dark tracking-tight truncate">
                    {providerName ? `${providerName}'s past work` : 'Past performances'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2 hover:bg-[#f5f2ed] rounded-full text-slate-500 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-7 py-5">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading catalog…
                </div>
              )}
              {!loading && error && (
                <div className="text-center py-16 text-red-500 text-sm">{error}</div>
              )}
              {!loading && !error && items && items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-[#f5f2ed] rounded-full flex items-center justify-center mb-3 text-slate-400">
                    <Music className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-brand-dark text-base">Nothing published yet</h3>
                  <p className="text-slate-500 text-[13px] mt-1 max-w-sm">
                    {providerName ? `${providerName} hasn't` : "This provider hasn't"} added any past
                    performances to their catalog.
                  </p>
                </div>
              )}
              {!loading && !error && items && items.length > 0 && (
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
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {previewing && (
              <PreviewOverlay item={previewing} onClose={() => setPreviewing(null)} />
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}

function PreviewOverlay({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  const videoId = extractYouTubeId(item.youtubeUrl);
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
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
