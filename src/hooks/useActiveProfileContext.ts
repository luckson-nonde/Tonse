import { useCallback, useEffect, useState } from 'react';
import { BusinessType } from '../services/categories';

/**
 * The dashboard's active "persona". Drives schema selection and
 * leads/products filtering across the whole dashboard.
 *
 *   { type: 'all' }                — merged multi-archetype view (default)
 *   { type: 'personal' }           — identity / security / financial only
 *   { type: 'business',
 *     archetype: 'RETAIL' }        — single-archetype dashboard
 *
 * Switched by the Profile popover in the sidebar; persisted in
 * localStorage so it survives reloads. A staff member with
 * `assignedArchetype` is forced to `{ type: 'business', archetype: X }`
 * — the popover hides the other options.
 */
export type ActiveProfileContext =
  | { type: 'all' }
  | { type: 'personal' }
  | { type: 'business'; archetype: BusinessType };

const STORAGE_KEY = 'tonse:activeProfileContext';

const DEFAULT_CONTEXT: ActiveProfileContext = { type: 'all' };

function loadFromStorage(): ActiveProfileContext {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTEXT;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      // Cheap shape validation — anything else falls through to default.
      if (parsed.type === 'all' || parsed.type === 'personal') {
        return { type: parsed.type };
      }
      if (parsed.type === 'business' && typeof parsed.archetype === 'string') {
        return { type: 'business', archetype: parsed.archetype as BusinessType };
      }
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
 * render for, given the user's archetype set + the active context.
 *
 *   - In `business:X` mode → X (the user's pick).
 *   - In `all` mode → null (merged view).
 *   - In `personal` mode → null (no business archetype).
 *
 * Single-archetype owners are normalised: `all` collapses to their
 * sole archetype, since there's nothing to merge.
 */
export function resolveActiveArchetype(
  context: ActiveProfileContext,
  ownerArchetypes: BusinessType[],
): BusinessType | null {
  if (context.type === 'business') return context.archetype;
  if (context.type === 'all' && ownerArchetypes.length === 1) {
    return ownerArchetypes[0];
  }
  return null;
}
