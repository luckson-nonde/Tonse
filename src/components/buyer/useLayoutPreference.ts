import { useCallback, useEffect, useState } from 'react';

export type MasterLayout = 'grid' | 'mosaic' | 'list';
export type SubLayout    = 'list' | 'cards' | 'chips';

const KEY_MASTER = 'tonse:buyer-cat-layout';
const KEY_SUB    = 'tonse:buyer-cat-sublayout';

const isMaster = (v: unknown): v is MasterLayout => v === 'grid' || v === 'mosaic' || v === 'list';
const isSub    = (v: unknown): v is SubLayout    => v === 'list' || v === 'cards' || v === 'chips';

function read<T>(key: string, validate: (v: unknown) => v is T, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw && validate(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function useLayoutPreference() {
  const [layout, setLayoutState]       = useState<MasterLayout>(() => read(KEY_MASTER, isMaster, 'grid'));
  const [subLayout, setSubLayoutState] = useState<SubLayout>(()    => read(KEY_SUB,    isSub,    'list'));

  useEffect(() => {
    try { window.localStorage.setItem(KEY_MASTER, layout); } catch { /* quota / private mode */ }
  }, [layout]);

  useEffect(() => {
    try { window.localStorage.setItem(KEY_SUB, subLayout); } catch { /* quota / private mode */ }
  }, [subLayout]);

  const setLayout    = useCallback((v: MasterLayout) => setLayoutState(v), []);
  const setSubLayout = useCallback((v: SubLayout) => setSubLayoutState(v), []);

  return { layout, setLayout, subLayout, setSubLayout };
}
