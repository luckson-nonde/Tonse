/**
 * Offline READ cache: the read-side counterpart to offlineWriteQueue.
 *
 * apiCall stores every successful GET response here (IndexedDB) and falls
 * back to it when a GET can't reach the server — so dashboards and lists the
 * user has already seen keep rendering offline. Network-first: the cache is
 * only ever consulted on a genuine network failure, never instead of a live
 * response (and never for an HTTP error — a real 401/500 is trusted as-is).
 *
 * Entries are keyed per-user (JWT `sub`, 'anon' pre-login) so switching
 * accounts on a shared device can never surface another user's data, and
 * tokenManager.clearTokens() purges the outgoing user's rows on logout.
 *
 * Every function silently no-ops when IndexedDB is unavailable or failing
 * (private browsing, quota, blocked upgrade) — offline caching degrades to
 * "not cached", it never breaks a live request.
 */

import { tokenManager } from './api/client';

const DB_NAME = 'tonse-read-cache';
const DB_VERSION = 1;
const STORE = 'responses';
const MAX_ENTRIES = 300;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedEntry {
  /** `${userId}::${endpoint}` — endpoint includes its query string as-is. */
  key: string;
  userId: string;
  endpoint: string;
  /** The full parsed ApiResponse envelope, exactly as apiCall returned it. */
  response: any;
  cachedAt: number;
}

// Endpoints that must never be served stale or persisted: encrypted secure
// files, and auth/session negotiation.
const NEVER_CACHE = /^\/(files\/|auth\/refresh|auth\/login-type)/;

export function isCacheableEndpoint(endpoint: string): boolean {
  return !NEVER_CACHE.test(endpoint);
}

function currentUserId(): string {
  const token = tokenManager.getAccessToken();
  const sub = token ? tokenManager.getTokenPayload(token)?.sub : null;
  return typeof sub === 'string' && sub ? sub : 'anon';
}

// One shared connection promise. Resolves null on ANY failure mode (no
// IndexedDB API, open throws synchronously in some private-browsing modes,
// onerror, onblocked) — callers treat null as "caching disabled".
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('by_userId', 'userId', { unique: false });
          store.createIndex('by_cachedAt', 'cachedAt', { unique: false });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // If another tab ever upgrades the DB version, release our handle so
        // its upgrade isn't wedged on `blocked` forever.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** Run `fn` against the store; swallow every failure (quota, aborts). */
async function withStore<R>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => void,
  result?: () => R
): Promise<R | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      tx.oncomplete = () => resolve(result ? result() : null);
      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
      fn(tx.objectStore(STORE));
    } catch {
      resolve(null);
    }
  });
}

/**
 * Persist a successful GET response. Fire-and-forget: apiCall never awaits
 * this, and any failure is silent. Each write also opportunistically trims
 * the store — everything older than MAX_AGE_MS, plus the oldest entries
 * beyond MAX_ENTRIES (age-ordered trim, not true LRU — good enough for a
 * stale-tolerant cache).
 */
export async function setCachedResponse(endpoint: string, response: any): Promise<void> {
  if (!isCacheableEndpoint(endpoint)) return;
  const userId = currentUserId();
  await withStore('readwrite', (store) => {
    store.put({
      key: `${userId}::${endpoint}`,
      userId,
      endpoint,
      response,
      cachedAt: Date.now(),
    } satisfies CachedEntry);

    const countReq = store.count();
    countReq.onsuccess = () => {
      const excess = countReq.result - MAX_ENTRIES;
      const cutoff = Date.now() - MAX_AGE_MS;
      let toDrop = Math.max(0, excess);
      const cursorReq = store.index('by_cachedAt').openCursor(); // ascending = oldest first
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return;
        const entry = cursor.value as CachedEntry;
        if (toDrop > 0 || entry.cachedAt < cutoff) {
          cursor.delete();
          toDrop--;
          cursor.continue();
        }
        // First entry that's neither excess nor expired: everything after it
        // is newer — stop walking.
      };
    };
  });
}

/** The current user's cached copy of a GET response, if one exists. */
export async function getCachedResponse(
  endpoint: string
): Promise<{ response: any; cachedAt: number } | null> {
  if (!isCacheableEndpoint(endpoint)) return null;
  const key = `${currentUserId()}::${endpoint}`;
  let entry: CachedEntry | undefined;
  await withStore('readonly', (store) => {
    const req = store.get(key);
    req.onsuccess = () => {
      entry = req.result as CachedEntry | undefined;
    };
  });
  if (!entry) return null;
  return { response: entry.response, cachedAt: entry.cachedAt };
}

/**
 * Drop every cached row for a user. Called from tokenManager.clearTokens()
 * with the OUTGOING user's id (captured before the token is removed);
 * defaults to the current user for ad-hoc use.
 */
export async function purgeUserCache(userId?: string): Promise<void> {
  const target = userId || currentUserId();
  await withStore('readwrite', (store) => {
    const cursorReq = store.index('by_userId').openCursor(IDBKeyRange.only(target));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
  });
}
