import { useEffect, useState } from 'react';

/**
 * "Lite motion" gate for physical touch devices.
 *
 * Budget Android GPUs (Mali/PowerVR) corrupt composited layers under the
 * transform-heavy step transitions used in onboarding (framer-motion x-slides,
 * layoutId FLIP projection, per-card crossfades): stale raster tiles from the
 * previous screen ghost over the current one. Desktop, emulators and the same
 * layouts without transforms are unaffected.
 *
 * The gate is `(pointer: coarse)` — any physical touch device gets zero
 * transform animation. That deliberately also flattens iOS Safari / Firefox
 * Android (which render fine): there is no reliable "budget GPU" feature
 * detection, and consistent instant navigation on touch beats UA-sniffing
 * fragility. Desktop (fine pointer) keeps every animation byte-identical.
 *
 * Consumers:
 *  - App.tsx wraps the router in `<MotionConfig reducedMotion={lite ? 'always' : 'user'}>`
 *    (makes transform/layout animations instant app-wide — but NOT opacity
 *    exits, which is why the tier wrappers also strip their props, see
 *    RoleSelection.tsx; PageTransition strips ALL its props under the OS
 *    prefers-reduced-motion setting for the same reason).
 *  - RoleSelection / CategorySelection strip transition props and bypass
 *    AnimatePresence crossfades entirely when lite.
 */
const QUERY = '(pointer: coarse)';

/** Non-reactive one-shot reader for use outside components (utils, handlers). */
export function isLiteMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

export function useLiteMotion(): boolean {
  const [lite, setLite] = useState(isLiteMotion);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setLite(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return lite;
}

export default useLiteMotion;
