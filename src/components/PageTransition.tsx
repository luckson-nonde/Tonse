import React from 'react';
import { motion, useReducedMotion, type MotionProps } from 'motion/react';

/**
 * Canonical page/view transition: ~200ms eased fade + x-axis slide-in,
 * enter-only. No `exit` and no AnimatePresence anywhere in this pattern —
 * an exit-then-enter sequence doubles perceived navigation latency.
 *
 * Reduced motion: we read useReducedMotion() (the OS prefers-reduced-motion
 * media query) directly instead of relying on MotionConfig, for two reasons:
 * (a) MotionConfig's reducedMotion only suppresses positional/transform keys,
 * never opacity, so it can't disable the fade; (b) the app-wide touch "lite"
 * override (see useLiteMotion.ts) sets MotionConfig reducedMotion="always"
 * for every coarse pointer — useReducedMotion() ignores that context, so
 * touch users keep the fade (their x-slide is stripped by MotionConfig)
 * while OS-reduced-motion users get no animation at all. Disabling is done
 * by prop ABSENCE, not duration:0 — same idiom as RoleSelection's slide().
 */
export function usePageTransitionProps(): Pick<
  MotionProps,
  'initial' | 'animate' | 'transition'
> {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return {};
  return {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  };
}

interface PageTransitionProps {
  children: React.ReactNode;
  /**
   * Re-triggers the enter animation when this changes (e.g. an active-tab
   * id). Omit for mount-only usage — route changes remount the element, so
   * mounting is the trigger.
   */
  transitionKey?: string | number;
  className?: string;
}

export default function PageTransition({
  children,
  transitionKey,
  className,
}: PageTransitionProps) {
  const motionProps = usePageTransitionProps();
  return (
    <motion.div
      key={transitionKey}
      data-page-transition
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
