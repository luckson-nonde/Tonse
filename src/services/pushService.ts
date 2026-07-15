/**
 * Web Push subscription plumbing (client side).
 *
 * Plain async functions (NOT a hook) so AuthContext.logout — a provider body,
 * not a render hook — can call unsubscribePush() directly without violating the
 * rules of hooks. FloatingHub drives subscribePush() from a real click (the
 * browser only honours Notification.requestPermission() from a user gesture).
 *
 * The service worker itself is a plain file at /sw.js (see public/sw.js) so it
 * never passes through Vite's esbuild `define` that rewrites `self`→window.global.
 */

import { apiClient } from './api/client';

export type PushSupport = 'unsupported' | 'default' | 'granted' | 'denied';

/** Whether this browser can do Web Push at all (SW + PushManager + Notification). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Current permission state, collapsed to a small union incl. unsupported. */
export function getPushPermission(): PushSupport {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushSupport;
}

/**
 * iOS only delivers Web Push to an INSTALLED PWA (Add to Home Screen) on
 * iOS ≥ 16.4 — a plain Safari tab can register a SW but never receives push.
 * Used by the opt-in banner to show an "Add to Home Screen" hint instead of a
 * prompt that would silently do nothing.
 */
export function isIosNonStandalone(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ masquerades as Mac; disambiguate by touch.
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  const standalone =
    (window.navigator as any).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
  return isIos && !standalone;
}

/** VAPID public key must be delivered as a Uint8Array to pushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Ask permission (from a user gesture) and register a push subscription with
 * the backend. Returns true only if a subscription was created and saved.
 */
export async function subscribePush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) {
    console.warn('Web Push disabled: VITE_VAPID_PUBLIC_KEY is not set.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    // Reuse an existing subscription if one is already present.
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    await apiClient.post('/notifications/push/subscribe', sub.toJSON());
    return true;
  } catch (e) {
    console.warn('Push subscribe failed (non-fatal):', e);
    return false;
  }
}

/**
 * Tear down the local push subscription and tell the backend to forget it.
 * Best-effort — must never block or fail logout.
 */
export async function unsubscribePush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await apiClient
      .post('/notifications/push/unsubscribe', { endpoint: sub.endpoint })
      .catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch (e) {
    console.warn('Push unsubscribe failed (non-fatal):', e);
  }
}
