/**
 * Offline write queue (outbox).
 *
 * A deliberately small, transient store — NOT a client database. The codebase
 * dropped its old Dexie/IndexedDB layer in favour of "PostgreSQL is the only
 * source of truth"; this brings back local persistence for one narrow purpose:
 * holding a handful of business writes that were made while offline until the
 * network returns. A flat array under one localStorage key keeps that "this is
 * an outbox, not a DB" distinction obvious (and stays well inside quota — each
 * item is a single JSON body, a few KB at most).
 *
 * Only the few call sites that pass `queueable` to apiClient reach this. On a
 * failed offline write, client.ts calls enqueueWrite(); replay is triggered by
 * the browser `online` event, our `tonse:online` event, and app boot
 * (AuthContext) — no polling loop.
 */

import { apiCall } from './api/client';

export type QueuedMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueuedWriteItem {
  /** Also the Idempotency-Key replayed to the server. */
  id: string;
  endpoint: string;
  method: QueuedMethod;
  /** Pre-stringified JSON body, replayed verbatim. */
  body?: string;
  label: string;
  changedEvent?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface EnqueueInput {
  id: string;
  endpoint: string;
  method: QueuedMethod;
  body?: string;
  label: string;
  changedEvent?: string;
}

const STORAGE_KEY = 'tonse:writeQueue';

/** Fresh idempotency key for one logical write. `crypto.randomUUID` is available
 *  in every browser we support over HTTPS/localhost; the fallback covers rare
 *  insecure contexts so a queued write always has a stable, unique key. */
export function newIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Persistence ────────────────────────────────────────────────────────────

function read(): QueuedWriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedWriteItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedWriteItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota / serialization failure — the write stays only in whatever the
    // caller already did; nothing else we can safely do here.
  }
  emitChanged();
}

function emitChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tonse:queue-changed'));
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Snapshot of the pending queue (oldest first). */
export function getQueuedWrites(): QueuedWriteItem[] {
  return read().sort((a, b) => a.createdAt - b.createdAt);
}

/** Add a write to the outbox. De-dupes on id (the idempotency key), so a retry
 *  of the same logical write never stacks. Uses a monotonic createdAt fallback
 *  so replay order is stable even if two enqueues land in the same millisecond. */
export function enqueueWrite(input: EnqueueInput): void {
  const items = read();
  if (items.some((it) => it.id === input.id)) return;
  const lastCreatedAt = items.reduce((max, it) => Math.max(max, it.createdAt), 0);
  const createdAt = Math.max(Date.now(), lastCreatedAt + 1);
  items.push({
    id: input.id,
    endpoint: input.endpoint,
    method: input.method,
    body: input.body,
    label: input.label,
    changedEvent: input.changedEvent,
    createdAt,
    attempts: 0,
  });
  write(items);
}

/** Remove a queued write without sending it (user "Discard"). Nothing ran
 *  server-side, so this is a pure local deletion. */
export function discardQueuedWrite(id: string): void {
  write(read().filter((it) => it.id !== id));
}

let draining = false;

/**
 * Replay queued writes sequentially, oldest first.
 *  - Still offline (NetworkError) → stop; leave the rest for the next trigger.
 *  - Success → dequeue, fire the item's refetch event + a synced notice.
 *  - Hard rejection (4xx/5xx, validation) → dequeue and surface a failure
 *    notice; don't retry forever or block the items behind it.
 * Replays never pass `queueable`, so a replay can't re-enqueue itself.
 */
export async function drainQueue(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  draining = true;
  try {
    // Re-read between items: the store can change (enqueue/discard) mid-drain.
    let queue = getQueuedWrites();
    while (queue.length > 0) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;
      const item = queue[0];
      try {
        await apiCall(item.endpoint, {
          method: item.method,
          body: item.body,
          headers: { 'Idempotency-Key': item.id },
        });
        // Success — remove and notify listeners.
        write(read().filter((it) => it.id !== item.id));
        if (item.changedEvent && typeof window !== 'undefined') {
          window.dispatchEvent(new Event(item.changedEvent));
        }
        dispatchItemEvent('tonse:queue-item-synced', { label: item.label });
      } catch (err: any) {
        if (err?.name === 'NetworkError' || err?.name === 'QueuedWrite') {
          // Still unreachable — bump the attempt counter and stop; the next
          // online/boot trigger picks up where we left off.
          bumpAttempt(item.id, err?.message);
          break;
        }
        // Hard rejection — drop it so it can't block the queue, and tell the user.
        write(read().filter((it) => it.id !== item.id));
        dispatchItemEvent('tonse:queue-item-failed', {
          label: item.label,
          message: String(err?.message || 'The change was rejected by the server.'),
        });
      }
      queue = getQueuedWrites();
    }
  } finally {
    draining = false;
  }
}

function bumpAttempt(id: string, lastError?: string): void {
  const items = read();
  const it = items.find((x) => x.id === id);
  if (!it) return;
  it.attempts += 1;
  if (lastError) it.lastError = lastError;
  write(items);
}

function dispatchItemEvent(name: string, detail: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

// ── Triggers ─────────────────────────────────────────────────────────────────
// Self-register at module scope (same plain-module idiom client.ts uses for
// token refresh). App boot replay is kicked separately from AuthContext, once
// auth has hydrated and an access token is available.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void drainQueue());
  window.addEventListener('tonse:online', () => void drainQueue());
}
