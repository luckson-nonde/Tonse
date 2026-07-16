import { isLiteMotion } from '../hooks/useLiteMotion';

/**
 * Compositor nudge for Android Chrome ghosting (belt-and-braces alongside the
 * lite-motion animation kill-switch — see useLiteMotion.ts).
 *
 * Toggling `will-change: transform` on an element promotes it to its own
 * compositing layer for one frame and then demotes it, which forces the
 * browser to rebuild that subtree's raster tiles. That flushes any stale
 * tiles a buggy mobile GPU kept from the previous screen — without moving
 * scroll, breaking `position: sticky`, or flashing content.
 *
 * MUST be pointed at an element framer-motion never animates (a plain
 * wrapper), never at a motion.* node — motion writes inline transform/will-
 * change on those and the styles would race.
 *
 * No-op on non-touch devices (the bug is exclusive to mobile hardware).
 */
export function nudgeRepaint(el: HTMLElement | null): void {
  if (!el || !isLiteMotion()) return;
  requestAnimationFrame(() => {
    el.style.willChange = 'transform';
    // Force a style/layout flush so the promotion actually commits …
    void el.offsetHeight;
    requestAnimationFrame(() => {
      // … then demote next frame; the demotion re-rasters the subtree.
      el.style.willChange = '';
    });
  });
}

export default nudgeRepaint;
