import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useMotionValue } from 'motion/react';
import { Minimize2, Bell, Maximize2, X, Smartphone, Download, PictureInPicture2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useBackgroundMode } from '../BackgroundModeContext';
import { useNotificationStream } from '../hooks/useNotificationStream';
import { fetchUnreadNotificationCount } from '../services/api/notificationService';
import {
  getPushPermission,
  isIosNonStandalone,
  isPushSupported,
  subscribePush,
} from '../services/pushService';
import {
  canPromptInstall,
  isStandalone,
  promptInstall,
  subscribeInstallable,
} from '../services/installPrompt';
import {
  closeFloatingWindow,
  isFloatingWindowSupported,
  openFloatingWindow,
  updateFloatingWindow,
} from '../services/floatingWindow';

/**
 * FloatingHub — the single, global "run in the background" widget.
 *
 * Mounted ONCE as a sibling of <Routes> (see App.tsx) so it survives every
 * navigation and exists for EVERY role — including ADMIN and PROMOTER, which
 * never render DashboardLayout, so a header-injected control would miss them.
 *
 * Two states, one affordance each — deliberately NO close button (only the
 * slide-to-logout ends a session):
 *   - not minimized → a small corner "Run in background" control
 *   - minimized     → a calm scrim + a draggable bubble showing a live inquiry
 *                     badge; click restores, drag repositions.
 */

// Pre-auth / gated routes where the widget must never appear (mirrors the
// public routes in App.tsx). Prefix match.
const NO_WIDGET_PREFIXES = [
  '/login',
  '/onboarding',
  '/role-selection',
  '/register',
  '/promote',
  '/business-verification',
  '/seller/',
  '/store-verification',
  '/verification-pending',
  '/force-password-change',
];

const PUSH_PROMPTED_KEY = 'tonse_push_prompted';
const INSTALL_PROMPTED_KEY = 'tonse_install_prompted';

/** Mirror the unread count onto the installed PWA's app icon (Badging API —
 *  feature-detected no-op elsewhere). */
function updateAppBadge(count: number) {
  try {
    const nav = navigator as any;
    if (count > 0) nav.setAppBadge?.(count);
    else nav.clearAppBadge?.();
  } catch {
    /* badge is best-effort */
  }
}

/** Tiny WebAudio ping when a new inquiry lands while minimized. */
function playPing() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1180, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* audio is best-effort */
  }
}

export default function FloatingHub() {
  const { user } = useAuth();
  const location = useLocation();
  const { isMinimized, minimize, restore, bubblePosition, setBubblePosition } = useBackgroundMode();

  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  // Bumped whenever beforeinstallprompt/appinstalled fires, so the banner
  // decision below re-evaluates with fresh canPromptInstall().
  const [installTick, setInstallTick] = useState(0);
  // Desktop always-on-top widget (Document PiP) currently showing?
  const [pipOpen, setPipOpen] = useState(false);

  useEffect(() => subscribeInstallable(() => setInstallTick((t) => t + 1)), []);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const x = useMotionValue(bubblePosition.x);
  const y = useMotionValue(bubblePosition.y);

  const hidden =
    !user || NO_WIDGET_PREFIXES.some((p) => location.pathname.startsWith(p));

  const refreshCount = useCallback(async () => {
    if (!user) return;
    const c = await fetchUnreadNotificationCount();
    setUnread(c);
  }, [user]);

  // Badge: initial fetch + 30s poll (same cadence DashboardLayout uses).
  useEffect(() => {
    if (hidden) return;
    refreshCount();
    const id = window.setInterval(refreshCount, 30000);
    return () => window.clearInterval(id);
  }, [hidden, refreshCount]);

  // Instant bump + chime on a live event. FloatingHub is only a badge here —
  // the loud IncomingLeadAlert still lives in ProviderDashboard.
  const bump = useCallback(() => {
    setUnread((c) => c + 1);
    setPulse(true);
    window.setTimeout(() => setPulse(false), 2500);
    if (isMinimized) playPing();
  }, [isMinimized]);

  useNotificationStream(hidden ? undefined : user?.id, {
    onNewLead: bump,
    onQuoteReceived: bump,
    onReserveReleased: bump,
    onMilestoneUnlocked: bump,
    onReconnect: refreshCount,
  });

  // Installed-PWA icon badge tracks the unread count.
  useEffect(() => {
    updateAppBadge(hidden ? 0 : unread);
  }, [unread, hidden]);

  // Logout (user → null) must dismiss the widget. AuthProvider wraps
  // BackgroundModeProvider, so AuthContext can't call restore() itself; this
  // watcher is the clean decoupling.
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current && !user) {
      restore();
      updateAppBadge(0);
      closeFloatingWindow();
      try {
        localStorage.setItem('tonse_minimized', 'false');
      } catch {
        /* non-fatal */
      }
    }
    prevUserRef.current = user;
  }, [user, restore]);

  // One-time push opt-in banner, shown the first time a user minimizes.
  useEffect(() => {
    if (!isMinimized || hidden) return;
    let prompted = false;
    try {
      prompted = localStorage.getItem(PUSH_PROMPTED_KEY) === 'true';
    } catch {
      /* ignore */
    }
    const perm = getPushPermission();
    if (!prompted && isPushSupported() && (perm === 'default' || isIosNonStandalone())) {
      setShowPushBanner(true);
    }
  }, [isMinimized, hidden]);

  const dismissPushBanner = useCallback(() => {
    setShowPushBanner(false);
    try {
      localStorage.setItem(PUSH_PROMPTED_KEY, 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    await subscribePush();
    setPushBusy(false);
    dismissPushBanner();
  }, [dismissPushBanner]);

  // One-time install banner (Android/desktop `beforeinstallprompt` platforms),
  // sequenced AFTER the push banner — never both at once. iOS gets its
  // Add-to-Home-Screen hint via the push banner instead.
  useEffect(() => {
    if (!isMinimized || hidden || showPushBanner) {
      setShowInstallBanner(false);
      return;
    }
    let prompted = false;
    try {
      prompted = localStorage.getItem(INSTALL_PROMPTED_KEY) === 'true';
    } catch {
      /* ignore */
    }
    setShowInstallBanner(!prompted && !isStandalone() && canPromptInstall());
  }, [isMinimized, hidden, showPushBanner, installTick]);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem(INSTALL_PROMPTED_KEY, 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const doInstall = useCallback(async () => {
    await promptInstall(); // accepted or dismissed — either way, don't nag again
    dismissInstallBanner();
  }, [dismissInstallBanner]);

  // ── Desktop always-on-top widget (Document PiP, Chromium desktop) ───────
  // Must be opened from a CLICK (the API requires a user gesture), so it's
  // called from the minimize button / pop-out pill — never from an effect.
  const tryOpenPip = useCallback(() => {
    if (!isFloatingWindowSupported()) return;
    void openFloatingWindow({
      unread,
      onRestore: restore, // service raises the tab via window.focus() first
      onClosed: () => setPipOpen(false),
    }).then(setPipOpen);
  }, [unread, restore]);

  const handleMinimize = useCallback(() => {
    minimize();
    tryOpenPip();
  }, [minimize, tryOpenPip]);

  // Live count into the desktop widget.
  useEffect(() => {
    updateFloatingWindow(unread);
  }, [unread]);

  // Restoring the app dismisses the desktop widget.
  useEffect(() => {
    if (!isMinimized) {
      closeFloatingWindow();
      setPipOpen(false);
    }
  }, [isMinimized]);

  if (hidden) return null;

  // ── Not minimized: subtle corner control ────────────────────────────────
  if (!isMinimized) {
    return (
      <button
        type="button"
        onClick={handleMinimize}
        title="Run in background"
        aria-label="Run in background"
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[120] flex items-center gap-2 rounded-full bg-[#1B3068] px-3 py-2 text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10 transition hover:bg-[#24407f] active:scale-95"
      >
        <Minimize2 className="h-4 w-4" />
        <span className="hidden sm:inline text-xs font-semibold">Background</span>
      </button>
    );
  }

  // ── Minimized: scrim + draggable bubble ─────────────────────────────────
  const displayName = (user?.companyName || user?.name || 'Tonse').trim();
  const initial = displayName.charAt(0).toUpperCase() || 'T';
  const iosHint = isIosNonStandalone();

  return (
    <div
      ref={constraintsRef}
      className="fixed inset-0 z-[350] pointer-events-none"
      aria-live="polite"
    >
      {/* Calm scrim — nothing is actually blocked (pointer-events-none). */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Centered status text. */}
      <div className="absolute inset-x-0 top-1/3 flex flex-col items-center px-6 text-center">
        <p className="text-white/90 text-lg font-semibold drop-shadow">
          Running in the background
        </p>
        <p className="text-white/70 text-sm mt-1 max-w-xs">
          Waiting for inquiries. Tap the bubble to come back — you stay signed in until you log out.
        </p>
        {/* Desktop Chromium: re-open the always-on-top widget (needs a fresh
            click — a reload into minimized state has no user activation). */}
        {isFloatingWindowSupported() && !pipOpen && (
          <button
            type="button"
            onClick={tryOpenPip}
            className="pointer-events-auto mt-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
          >
            <PictureInPicture2 className="h-4 w-4 text-[#c9973a]" />
            Pop out desktop widget
          </button>
        )}
      </div>

      {/* Push opt-in banner (one-time). */}
      {showPushBanner && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-6 mx-auto flex max-w-sm items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-slate-200 md:left-6 md:right-auto md:mx-0">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B3068]/10 text-[#1B3068]">
            {iosHint ? <Smartphone className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {iosHint ? 'Add Tonse to your Home Screen' : 'Get notified even when this tab is closed'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {iosHint
                ? 'On iPhone/iPad, install Tonse (Share → Add to Home Screen) to receive alerts in the background.'
                : "We'll ping you the moment a new inquiry arrives — no need to keep this open."}
            </p>
            {!iosHint && (
              <button
                type="button"
                onClick={enablePush}
                disabled={pushBusy}
                className="mt-2 rounded-lg bg-[#1B3068] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#24407f] disabled:opacity-60"
              >
                {pushBusy ? 'Enabling…' : 'Turn on notifications'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={dismissPushBanner}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Install-app card (one-time, shown after the push banner is settled).
          This is the TONSE-DESIGNED layer of the install flow — the final
          confirm dialog after "Install app" is Chrome's own UI and cannot be
          styled by any website. */}
      {showInstallBanner && (
        <div className="pointer-events-auto absolute inset-x-4 bottom-6 mx-auto max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 md:left-6 md:right-auto md:mx-0">
          {/* Brand header band */}
          <div
            className="relative flex items-center gap-3 px-5 py-4"
            style={{
              background:
                'radial-gradient(120% 160% at 88% -20%, rgba(201,151,58,.30), transparent 55%), linear-gradient(180deg, #1B3068, #16264F)',
            }}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c9973a]/60 bg-white/5 font-serif text-2xl font-bold text-[#c9973a]">
              T
            </div>
            <div className="min-w-0">
              <p className="font-serif text-lg font-bold leading-tight text-white">
                TON<span className="text-[#c9973a]">SE</span>
              </p>
              <p className="text-[11px] uppercase tracking-widest text-white/60">
                Install the app
              </p>
            </div>
            <button
              type="button"
              onClick={dismissInstallBanner}
              aria-label="Dismiss"
              className="absolute right-3 top-3 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-slate-600">
              Tonse on your device — opens full-screen from your home screen or
              taskbar, stays signed in, and shows new-inquiry alerts right on the
              icon.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={doInstall}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#c9973a] to-[#b8832a] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#c9973a]/25 transition hover:brightness-110 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Install app
              </button>
              <button
                type="button"
                onClick={dismissInstallBanner}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Not now
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Your browser will show a quick confirmation.
            </p>
          </div>
        </div>
      )}

      {/* Draggable bubble. */}
      <motion.button
        type="button"
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.04}
        style={{ x, y }}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={() => {
          setBubblePosition({ x: x.get(), y: y.get() });
          // Let the suppressed click settle before re-enabling tap-to-restore.
          window.setTimeout(() => {
            draggedRef.current = false;
          }, 0);
        }}
        onClick={() => {
          if (draggedRef.current) return;
          restore();
        }}
        title="Restore Tonse"
        aria-label="Restore Tonse"
        className="pointer-events-auto absolute bottom-6 right-6 flex h-16 w-16 cursor-grab items-center justify-center rounded-full bg-[#1B3068] text-white shadow-2xl ring-2 ring-white/20 active:cursor-grabbing"
      >
        <span className="font-serif text-2xl font-bold text-[#c9973a]">{initial}</span>

        {/* Restore hint icon on hover. */}
        <Maximize2 className="pointer-events-none absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-white/95 p-1 text-[#1B3068] shadow" />

        {/* Live unread badge. */}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}

        {/* New-inquiry pulse. */}
        {pulse && (
          <span className="absolute inset-0 animate-ping rounded-full bg-[#c9973a]/50" />
        )}
      </motion.button>
    </div>
  );
}
