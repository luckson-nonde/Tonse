import { useEffect, useRef } from 'react';

/**
 * Minimal, dependency-free focus trap for modal dialogs. The codebase has no
 * focus-trap library or utility, so this is the shared primitive for the
 * Universal Consent Modal (and any future dialog).
 *
 * While `active`, it:
 *  - focuses the first focusable element inside `containerRef` (or a supplied
 *    `initialFocusRef`) once the dialog has mounted,
 *  - keeps Tab / Shift+Tab cycling within the container,
 *  - routes Escape to `onEscape`,
 *  - restores focus to whatever was focused before it activated, on teardown.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface FocusTrapOptions {
  onEscape?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  containerRef: React.RefObject<T | null>,
  { onEscape, initialFocusRef }: FocusTrapOptions = {}
): void {
  // Keep the latest callbacks/refs without re-running the effect (which would
  // re-steal focus and reset the restore target every render).
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;
  const initialFocusRefBox = useRef(initialFocusRef);
  initialFocusRefBox.current = initialFocusRef;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Focus after a frame so the entrance mount is committed first.
    const raf = requestAnimationFrame(() => {
      const target = initialFocusRefBox.current?.current ?? focusables()[0] ?? container;
      target?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}

export default useFocusTrap;
