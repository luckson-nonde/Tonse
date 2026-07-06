/**
 * Category availability (admin on/off control).
 *
 * The taxonomy itself is a static build-time import (`CATEGORIES_DB`). This
 * module layers the admin's runtime on/off state on top: it fetches
 * `GET /categories/status` once, computes which ids are *effectively*
 * unavailable, and exposes helpers so every picker/browse surface can hide
 * them.
 *
 * Effective-availability rule (the catalog is a strict 2-level tree):
 * a category is available iff it is active AND — for a subcategory — its
 * parent is also active. So disabling a parent hides its whole branch.
 *
 * Fail-open: if the status fetch errors, everything is treated as available.
 * A status hiccup must never black out the marketplace.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiClient } from '../api/client';

export interface CategoryStatusItem {
  id: string;
  parentId: string | null;
  isActive: boolean;
}

/** Compute the set of effectively-disabled ids from a raw status list. */
function computeDisabled(items: CategoryStatusItem[]): Set<string> {
  const activeById = new Map(items.map((i) => [i.id, i.isActive]));
  const disabled = new Set<string>();
  for (const i of items) {
    const parentActive = i.parentId == null ? true : activeById.get(i.parentId) !== false;
    if (i.isActive === false || !parentActive) disabled.add(i.id);
  }
  return disabled;
}

// ── Module-level snapshot (for non-React readers, e.g. quote/schema helpers) ──
let snapshotDisabled = new Set<string>();
let snapshotReady = false;

/** Effectively-disabled ids as of the last successful fetch (may be empty). */
export function getEffectiveDisabledIds(): Set<string> {
  return snapshotDisabled;
}
/** True once a status fetch has resolved at least once. */
export function isAvailabilitySnapshotReady(): boolean {
  return snapshotReady;
}
/** Pure check usable outside React. Fail-open before the first fetch. */
export function isCategoryAvailable(id: string): boolean {
  return !snapshotDisabled.has(id);
}

async function fetchStatus(): Promise<CategoryStatusItem[]> {
  const res = await apiClient.get<{ items: CategoryStatusItem[] }>('/categories/status');
  return res.data?.items ?? [];
}

// ── React context ────────────────────────────────────────────────────────
interface AvailabilityContextValue {
  isReady: boolean;
  disabledIds: Set<string>;
  isAvailable: (id: string) => boolean;
  filterAvailable: <T extends { id: string }>(categories: T[]) => T[];
  refresh: () => Promise<void>;
}

const AvailabilityContext = createContext<AvailabilityContextValue | undefined>(undefined);

export function CategoryAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [disabledIds, setDisabledIds] = useState<Set<string>>(snapshotDisabled);
  const [isReady, setIsReady] = useState<boolean>(snapshotReady);

  const load = useCallback(async () => {
    try {
      const items = await fetchStatus();
      const disabled = computeDisabled(items);
      snapshotDisabled = disabled;
      snapshotReady = true;
      setDisabledIds(disabled);
      setIsReady(true);
    } catch (e) {
      // Fail-open: keep whatever we had (initially empty = all available).
      snapshotReady = true;
      setIsReady(true);
      // eslint-disable-next-line no-console
      console.warn('Category availability fetch failed — treating all as available:', e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<AvailabilityContextValue>(() => {
    const isAvailable = (id: string) => !disabledIds.has(id);
    return {
      isReady,
      disabledIds,
      isAvailable,
      filterAvailable: (categories) => categories.filter((c) => isAvailable(c.id)),
      refresh: load,
    };
  }, [disabledIds, isReady, load]);

  return (
    <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>
  );
}

/**
 * Access category availability. Safe to call outside the provider — it
 * degrades to the module-level snapshot (fail-open) so components that
 * render before/without the provider never crash.
 */
export function useCategoryAvailability(): AvailabilityContextValue {
  const ctx = useContext(AvailabilityContext);
  if (ctx) return ctx;
  const isAvailable = (id: string) => !snapshotDisabled.has(id);
  return {
    isReady: snapshotReady,
    disabledIds: snapshotDisabled,
    isAvailable,
    filterAvailable: (categories) => categories.filter((c) => isAvailable(c.id)),
    refresh: async () => {
      /* no-op outside provider */
    },
  };
}
