/* Tonse Hub — Web Push service worker (plain JS, served verbatim from /sw.js).
 *
 * Kept OUT of the Vite build on purpose: vite.config.ts rewrites the `self`
 * global to the window shim for a legacy Node dependency, which would throw
 * here (a service worker's global scope IS `self` and has no `window`). Files
 * in public/ are copied byte-for-byte, so this file is never transformed.
 *
 * It is intentionally "dumb": the notification title/body and the click-through
 * URL are decided server-side (NotificationsService) and arrive in the push
 * payload — this worker just renders and routes.
 */

self.addEventListener('install', () => {
  // Activate immediately so push works on first load without a second visit.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Tonse Hub', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Tonse Hub';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'tonse-notification',
    renotify: true,
    data: { url: payload.url || '/' },
    vibrate: [350, 180, 350],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        // Focus an already-open Tonse window and route it, if any.
        for (const client of clientsArr) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              client.navigate(targetUrl).catch(() => {});
            }
            return;
          }
        }
        // Otherwise open a fresh window.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
