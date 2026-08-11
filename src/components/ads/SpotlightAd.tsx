import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { adsService, adMediaUrl, Advertisement } from '../../services/api/adsService';
import { runAdClickThrough } from '../../services/adClickThrough';
import {
  getViewerKey,
  subscribeToShoppingIntent,
  type ShoppingIntent,
} from '../../services/spotlightTrigger';
import { useAuth } from '../../AuthContext';

/** Breathing room between the intent (a tap) and the pop-up, so it never
 *  lands under a finger that's still moving. */
const SHOW_DELAY_MS = 1400;

/** Routes where an ad would be an interruption, not an offer. Money in
 *  flight and account-critical flows are off-limits regardless of the cap. */
const BLOCKED_PATH_PREFIXES = [
  '/payment',
  '/buyer/payment',
  '/buyer/inquiry-payment',
  '/provider',
  '/admin',
  '/labour',
  '/login',
  '/register',
  '/promote',
  '/e/', // public ticket checkout — someone mid-purchase of someone else's thing
];

/**
 * The Spotlight — a single, paid, full-attention advertisement shown OVER the
 * app at a moment of genuine buying intent.
 *
 * Everything here is in service of one rule: it must never feel like spam.
 *   • It only ever appears in response to `tonse:shopping-intent` — someone
 *     telling us what they're shopping for — never on a timer or a page load.
 *   • It waits SHOW_DELAY_MS so it can't intercept the tap that triggered it.
 *   • The SERVER decides whether this viewer has already had their fill and
 *     which advertiser's turn it is (fair round-robin). This component cannot
 *     over-show even if it wanted to; a `null` answer means stay quiet.
 *   • Sellers, providers and admins never see it — they're working, not
 *     shopping. Neither does anyone mid-payment.
 *   • One at a time, dismissible two ways (✕ and backdrop), and it never
 *     re-opens for the same intent.
 *
 * Mounted once, zero-prop, in App.tsx beside FloatingHub — self-gating in the
 * same style, because the funnel steps that signal intent live several
 * routers deep and shouldn't know advertising exists.
 */
export default function SpotlightAd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [ad, setAd] = useState<Advertisement | null>(null);
  const [open, setOpen] = useState(false);
  // Guards a second fetch while one is in flight or a pop-up is on screen —
  // two intents in quick succession must not stack two modals.
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathBlocked = useCallback(
    (path: string) => BLOCKED_PATH_PREFIXES.some((p) => path.startsWith(p)),
    [],
  );

  // Shopping, not working. A seller/provider/admin is in their own dashboard;
  // interrupting them with an ad for someone else's shop is pure noise.
  const audienceAllowed = !user || user.role === 'BUYER';

  const close = useCallback(() => {
    setOpen(false);
    // Keep `ad` briefly so the exit animation has something to render.
    setTimeout(() => {
      setAd(null);
      busyRef.current = false;
    }, 250);
  }, []);

  const onIntent = useCallback(
    (intent: ShoppingIntent) => {
      if (busyRef.current || !audienceAllowed) return;
      if (pathBlocked(window.location.pathname)) return;
      busyRef.current = true;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        // Re-check: the delay is long enough for the shopper to have moved on
        // to a page where a pop-up would be wrong.
        if (pathBlocked(window.location.pathname)) {
          busyRef.current = false;
          return;
        }
        const picked = await adsService.getPopupAd(
          getViewerKey(user?.id),
          intent.categoryId,
        );
        if (!picked) {
          // Capped, or nothing running. Silence is the correct outcome.
          busyRef.current = false;
          return;
        }
        setAd(picked);
        setOpen(true);
      }, SHOW_DELAY_MS);
    },
    [audienceAllowed, pathBlocked, user?.id],
  );

  useEffect(() => subscribeToShoppingIntent(onIntent), [onIntent]);

  // Navigating away closes it — an offer tied to what you were just doing
  // shouldn't follow you to the next screen.
  useEffect(() => {
    if (open) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!ad) return null;

  const handleClick = () => {
    void adsService.recordPopupClick(ad.id, getViewerKey(user?.id));
    setOpen(false);
    runAdClickThrough(ad, user, navigate);
    setTimeout(() => {
      setAd(null);
      busyRef.current = false;
    }, 250);
  };

  const media = adMediaUrl(ad.mediaUrl);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          /* z-[280]: above the page and the ad rails, deliberately BELOW the
             payment sheet (300), the background scrim (350) and every real
             modal (9999+) — an advert must never cover a decision. */
          className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Sponsored: ${ad.title}`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            /* Opaque border — translucent strokes on rounded cards smear on
               Mali GPUs (android-gpu-ghosting playbook). */
            className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#e8e4dc]"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Dismiss advert"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[9px] font-black uppercase tracking-[0.18em] text-[#a87b28]">
              Sponsored
            </span>

            <button type="button" onClick={handleClick} className="block w-full text-left">
              <span className="block w-full aspect-[4/5] bg-slate-100 overflow-hidden">
                {ad.mediaType === 'VIDEO' ? (
                  <video
                    src={media}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img src={media} alt={ad.title} className="w-full h-full object-cover" />
                )}
              </span>

              <span className="block p-5">
                <span className="block text-[16px] font-black text-[#0A1931] leading-snug">
                  {ad.title}
                </span>
                <span className="mt-3 w-full inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-[12px] font-black uppercase tracking-widest transition-colors">
                  See this offer
                </span>
                <span className="block mt-2.5 text-center text-[10px] text-slate-400">
                  Tap to send this shop your request
                </span>
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
