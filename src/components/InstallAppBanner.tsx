import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import {
  canPromptInstall,
  isStandalone,
  markInstallPromptDismissed,
  promptInstall,
  subscribeInstallable,
  wasInstallPromptDismissed,
} from '../services/installPrompt';
import { isIosNonStandalone } from '../services/pushService';
import { useBackgroundMode } from '../BackgroundModeContext';
import Logo from './Logo';

/**
 * "Install Nyuwe" offer for ORDINARY browsing — including visitors who
 * aren't signed in.
 *
 * Why this exists separately from FloatingHub's install banner: that one is
 * gated on `isMinimized && user`, so it only ever reached a signed-in user who
 * had explicitly minimized the app into background mode. Meanwhile
 * initInstallPrompt() calls preventDefault() on `beforeinstallprompt`, which
 * suppresses Chrome's own mini-infobar — so a first-time visitor got no
 * install offer from anyone. This component is the missing surface; the two
 * are mutually exclusive via `isMinimized`.
 *
 * iOS never fires `beforeinstallprompt`, so Safari gets the manual
 * Share → Add to Home Screen hint instead of a button that cannot work.
 */

/** Let the page paint and settle before offering anything. */
const APPEAR_DELAY_MS = 2500;

export default function InstallAppBanner() {
  const { isMinimized } = useBackgroundMode();
  const [visible, setVisible] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [tick, setTick] = useState(0);

  // beforeinstallprompt can arrive well after mount; re-check when it does.
  useEffect(() => subscribeInstallable(() => setTick((t) => t + 1)), []);

  const isIos = isIosNonStandalone();

  useEffect(() => {
    if (isMinimized) {
      // FloatingHub owns the offer in background mode — never both.
      setVisible(false);
      return;
    }
    if (wasInstallPromptDismissed() || isStandalone()) return;

    const native = canPromptInstall();
    if (!native && !isIos) return;

    const id = window.setTimeout(() => {
      setInstallable(native);
      setVisible(true);
    }, APPEAR_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [isMinimized, isIos, tick]);

  const dismiss = useCallback(() => {
    setVisible(false);
    markInstallPromptDismissed();
  }, []);

  const install = useCallback(async () => {
    await promptInstall(); // accepted or dismissed — either way, don't nag again
    dismiss();
  }, [dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-label="Install Nyuwe"
          className="fixed inset-x-4 bottom-4 z-[150] mx-auto max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#e8e0d0] sm:left-6 sm:right-auto sm:mx-0 pb-safe"
        >
          <div
            className="relative flex items-center gap-3 px-5 py-4"
            style={{
              background:
                'radial-gradient(120% 160% at 88% -20%, rgba(201,151,58,.30), transparent 55%), linear-gradient(180deg, #1B3068, #16264F)',
            }}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c9973a] bg-white/5">
              <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-md" />
            </div>
            <div className="min-w-0">
              <Logo variant="light" className="text-lg" />
              <p className="text-[11px] uppercase tracking-widest text-white/60">
                {isIos && !installable ? 'Add to Home Screen' : 'Install the app'}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-3 top-3 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4">
            {isIos && !installable ? (
              <>
                <p className="text-sm text-slate-600">
                  Keep Nyuwe one tap away — it opens full-screen and stays signed in.
                </p>
                <ol className="mt-3 space-y-2 text-[13px] text-slate-600">
                  <li className="flex items-center gap-2">
                    <Share className="h-4 w-4 shrink-0 text-[#c9973a]" />
                    Tap <span className="font-semibold text-slate-800">Share</span> in Safari&rsquo;s
                    toolbar
                  </li>
                  <li className="flex items-center gap-2">
                    <SquarePlus className="h-4 w-4 shrink-0 text-[#c9973a]" />
                    Choose{' '}
                    <span className="font-semibold text-slate-800">Add to Home Screen</span>
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-4 w-full rounded-full border border-[#e8e0d0] px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-[#1B3068] hover:text-[#1B3068]"
                >
                  Got it
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Keep Nyuwe one tap away — opens full-screen from your home screen,
                  works on a weak connection, and stays signed in.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={install}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#c9973a] to-[#b8832a] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#c9973a]/25 transition hover:brightness-110 active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" />
                    Install
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                  >
                    Not now
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
