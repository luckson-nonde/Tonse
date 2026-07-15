import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Background ("run in the background") mode.
 *
 * When a user minimizes, the whole app tree STAYS MOUNTED — we only flip a
 * boolean and let FloatingHub paint a calm scrim + a draggable bubble over the
 * top. Nothing unmounts, so in-progress forms / scroll position survive a
 * minimize→restore round-trip. The only way to actually end the session is the
 * existing slide-to-logout (there is deliberately no "close").
 *
 * State is persisted to localStorage so reloading a minimized tab lands back in
 * bubble state (a reload is not "closing"), mirroring the `tonse_onboarded`
 * pattern in App.tsx / AuthContext.
 */

const MINIMIZED_KEY = 'tonse_minimized';
const BUBBLE_POS_KEY = 'tonse_bubble_pos';

export interface BubblePosition {
  x: number;
  y: number;
}

interface BackgroundModeContextType {
  isMinimized: boolean;
  minimize: () => void;
  restore: () => void;
  bubblePosition: BubblePosition;
  setBubblePosition: (p: BubblePosition) => void;
}

const BackgroundModeContext = createContext<BackgroundModeContextType | undefined>(undefined);

function readMinimized(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(MINIMIZED_KEY) === 'true';
  } catch {
    return false;
  }
}

function readBubblePosition(): BubblePosition {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BUBBLE_POS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') return parsed;
    }
  } catch {
    /* fall through to default */
  }
  return { x: 0, y: 0 };
}

export function BackgroundModeProvider({ children }: { children: React.ReactNode }) {
  const [isMinimized, setIsMinimized] = useState<boolean>(readMinimized);
  const [bubblePosition, setBubblePositionState] = useState<BubblePosition>(readBubblePosition);

  useEffect(() => {
    try {
      localStorage.setItem(MINIMIZED_KEY, isMinimized ? 'true' : 'false');
    } catch {
      /* non-fatal */
    }
  }, [isMinimized]);

  useEffect(() => {
    try {
      localStorage.setItem(BUBBLE_POS_KEY, JSON.stringify(bubblePosition));
    } catch {
      /* non-fatal */
    }
  }, [bubblePosition]);

  const minimize = useCallback(() => setIsMinimized(true), []);
  const restore = useCallback(() => setIsMinimized(false), []);
  const setBubblePosition = useCallback((p: BubblePosition) => setBubblePositionState(p), []);

  const value = useMemo(
    () => ({ isMinimized, minimize, restore, bubblePosition, setBubblePosition }),
    [isMinimized, minimize, restore, bubblePosition, setBubblePosition]
  );

  return <BackgroundModeContext.Provider value={value}>{children}</BackgroundModeContext.Provider>;
}

export function useBackgroundMode(): BackgroundModeContextType {
  const ctx = useContext(BackgroundModeContext);
  if (!ctx) throw new Error('useBackgroundMode must be used within a BackgroundModeProvider');
  return ctx;
}
