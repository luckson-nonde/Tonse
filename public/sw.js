/* Tonse Hub — service worker (plain JS, served verbatim from /sw.js).
 *
 * Kept OUT of the Vite build on purpose: vite.config.ts rewrites the `self`
 * global to the window shim for a legacy Node dependency, which would throw
 * here (a service worker's global scope IS `self` and has no `window`). Files
 * in public/ are copied byte-for-byte, so this file is never transformed.
 *
 * Two responsibilities:
 *   1. Web Push — render OS notifications and route clicks. Intentionally
 *      "dumb": title/body/url are decided server-side (NotificationsService).
 *   2. Offline app shell — network-first navigations with a cached-shell
 *      fallback, cache-first for Vite's hashed /assets/ bundles, and a
 *      branded /offline.html when nothing is cached. API/uploads/secure-file
 *      requests are NEVER intercepted; offline covers the shell, not data.
 */

const VERSION = 'v2';
const SHELL_CACHE = 'tonse-shell-' + VERSION;
const PRECACHE = ['/', '/offline.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

// ── Lifecycle ─────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // A failed precache (e.g. offline first visit) must never brick install —
      // runtime caching backfills the shell on the next successful navigation.
      .catch(() => {})
      // Activate immediately so push works on first load without a second visit.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('tonse-') && k !== SHELL_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Offline app shell ─────────────────────────────────────────────────────

// Paths the SW must pass straight to the network: live data, user uploads,
// encrypted secure files, and dev-server internals (so Vite/HMR never gets a
// stale cached module). The production API lives on another origin entirely
// and is already excluded by the same-origin check.
const NETWORK_ONLY_PREFIXES = [
  '/api/',
  '/uploads/',
  '/files/',
  '/notifications/',
  '/src/',
  '/node_modules/',
  '/@vite',
  '/@react-refresh',
];

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // Media/range requests must stream from the network untouched.
  if (request.headers.get('range')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API, fonts, CDNs — untouched
  if (NETWORK_ONLY_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // SPA navigations: network-first (never a stale shell while online), keep the
  // freshest shell cached under '/', fall back to it offline, else offline.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches
            .match('/')
            .then((shell) => shell || caches.match('/offline.html'))
            .then((page) => page || Response.error())
        )
    );
    return;
  }

  // Vite's content-hashed bundles are immutable → cache-first, backfill on miss.
  // Root statics (icons, manifest, favicon) get the same treatment; a VERSION
  // bump busts them on the next deploy of this file.
  const isHashedAsset = url.pathname.startsWith('/assets/');
  const isRootStatic = /\.(png|ico|webmanifest|svg)$/.test(url.pathname);
  if (isHashedAsset || isRootStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          })
      )
    );
  }
  // Everything else: default network behaviour.
});

// ── Web Push ──────────────────────────────────────────────────────────────

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
