import { useCallback, useEffect, useState } from 'react';
import { BusinessType } from '../services/categories';

/**
 * The dashboard's active "persona". One archetype at a time — no
 * merged view. Default on first login is RETAIL (Buy New) because
 * the MVP centers on multi-archetype Electronics sellers who almost
 * always do retail; the helper `getEffectiveBusinessType` falls
 * back to the seller's first archetype if they don't serve RETAIL.
 *
 *   { type: 'business', archetype } — viewing one archetype's surface
 *   { type: 'personal' }            — identity / security / financial
 *
 * Switched via the Profile popover in the sidebar; persisted in
 * localStorage. Staff with `assignedArchetype` are pinned to
 * `{ type: 'business', archetype: X }` — the popover hides the
 * other archetype options.
 */
export type ActiveProfileContext =
  | { type: 'personal' }
  | { type: 'business'; archetype: BusinessType };

const STORAGE_KEY = 'tonse:activeProfileContext';

// Default = Buy New / Retail. The earlier "{ type: 'all' }" merged
// mode is gone; one view at a time.
const DEFAULT_CONTEXT: ActiveProfileContext = {
  type: 'business',
  archetype: 'RETAIL',
};

function loadFromStorage(): ActiveProfileContext {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTEXT;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      // Cheap shape validation — anything else falls through to default.
      if (parsed.type === 'personal') {
        return { type: 'personal' };
      }
      if (parsed.type === 'business' && typeof parsed.archetype === 'string') {
        return { type: 'business', archetype: parsed.archetype as BusinessType };
      }
      // Legacy 'all' rows from before the simplification — coerce to
      // the new default so existing localStorage values don't pin
      // users in a mode that no longer exists.
      if (parsed.type === 'all') return DEFAULT_CONTEXT;
    }
  } catch {
    // Corrupt JSON — fall through to default and overwrite next save.
  }
  return DEFAULT_CONTEXT;
}

/**
 * Subscribe to the active profile context. Returns the current value
 * and a setter that persists to localStorage. Multiple components
 * call this and stay in sync via a 'storage' event listener so a
 * change in one tab updates the others.
 */
export function useActiveProfileContext(): {
  context: ActiveProfileContext;
  setContext: (next: ActiveProfileContext) => void;
} {
  const [context, setContextState] = useState<ActiveProfileContext>(loadFromStorage);

  // Keep tabs in sync — also handles components reading the same value
  // before another component triggered an update in the same tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setContextState(loadFromStorage());
      }
    };
    const onCustom = () => setContextState(loadFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('tonse:activeProfileContext:changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('tonse:activeProfileContext:changed', onCustom);
    };
  }, []);

  const setContext = useCallback((next: ActiveProfileContext) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Quota / SecurityError — fall back to in-memory only. The next
      // setContextState below still updates this hook's consumers.
    }
    setContextState(next);
    // Notify other hook instances in the same tab. The native 'storage'
    // event only fires across tabs, not within the same window.
    window.dispatchEvent(new CustomEvent('tonse:activeProfileContext:changed'));
  }, []);

  return { context, setContext };
}

/**
 * Convenience: derive the archetype the dashboard should currently
 * render for, given the active context.
 *
 *   - In `business:X` mode → X (the user's pick).
 *   - In `personal` mode   → null (no business archetype to render).
 *
 * Note: `ownerArchetypes` is no longer used here (the merged 'all'
 * mode that needed it has been removed) but kept in the signature
 * to avoid touching every call site at once. Drop the param when
 * we next refactor the consumers.
 */
export function resolveActiveArchetype(
  context: ActiveProfileContext,
  _ownerArchetypes: BusinessType[],
): BusinessType | null {
  if (context.type === 'business') return context.archetype;
  return null;
}
