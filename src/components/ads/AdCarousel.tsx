import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone } from 'lucide-react';
import { adsService, Advertisement, AdPlacementLocation } from '../../services/api/adsService';

const ROTATE_MS = 10000;

interface AdCarouselProps {
  placement: AdPlacementLocation;
  /** Controls aspect ratio — banner (16:9, homepage center) or sidebar
   *  (vertical card, secondary pages). Defaults from `placement`. */
  variant?: 'banner' | 'sidebar';
  /** CATEGORY_SIDEBAR only: the master category the buyer is browsing, so
   *  the rail shows ads bought for THAT category (electronics → electronics
   *  ads, loans → lender ads) ahead of untargeted ones. */
  categoryId?: string;
}

/**
 * Rotating ad slot — homepage center banner or secondary-page sidebar.
 * Cycles through every APPROVED, currently-live ad for the placement every
 * 10s (paused on hover); shows a "want to advertise here?" fallback when
 * there's nothing to show. No reusable carousel exists elsewhere in the app
 * (the only precedent, DashboardCalendar's counter-card rotation, is tightly
 * coupled to that shape) — this one is self-contained.
 */
export default function AdCarousel({ placement, variant, categoryId }: AdCarouselProps) {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const resolvedVariant = variant ?? (placement === 'HOMEPAGE_CENTER' ? 'banner' : 'sidebar');

  useEffect(() => {
    let cancelled = false;
    // Re-runs when the buyer switches category, so the rail re-targets.
    setLoaded(false);
    adsService
      .getActiveAds(placement, categoryId)
      .then((rows) => {
        if (!cancelled) {
          setAds(rows);
          setIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [placement, categoryId]);

  useEffect(() => {
    if (paused || ads.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, ads.length]);

  const handleAdClick = (ad: Advertisement) => {
    if (ad.targetUrl.startsWith('/')) {
      navigate(ad.targetUrl);
    } else {
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const aspectClass = resolvedVariant === 'banner' ? 'aspect-video' : 'aspect-[4/5]';

  // Nothing loaded yet — render nothing rather than a flash of the fallback.
  if (!loaded) return null;

  if (ads.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate('/provider/advertise')}
        className={`w-full ${aspectClass} rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#C9973A]/40 hover:bg-[#fdf6e9] transition-all flex flex-col items-center justify-center gap-2 text-center p-6 group`}
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-[#C9973A] transition-colors">
          <Megaphone className="w-5 h-5" />
        </div>
        <p className="text-[12px] font-bold text-slate-500 group-hover:text-[#b8852f] transition-colors">
          Want to advertise here?
        </p>
        <p className="text-[10px] text-slate-400 max-w-[220px]">Click to promote your shop.</p>
      </button>
    );
  }

  const ad = ads[index];

  return (
    <div
      className={`relative w-full ${aspectClass} rounded-3xl overflow-hidden bg-slate-100 shadow-sm border border-slate-100 cursor-pointer group`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => handleAdClick(ad)}
      role="button"
      title={ad.title}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={ad.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          {ad.mediaType === 'IMAGE' ? (
            <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <video
              src={ad.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
            <p className="text-white text-[12px] font-bold truncate drop-shadow">{ad.title}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {ads.length > 1 && (
        <div className="absolute top-3 right-3 flex gap-1 z-10">
          {ads.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
