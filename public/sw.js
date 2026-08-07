/* Nyuwe Zambia — service worker (plain JS, served verbatim from /sw.js).
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

// v8: Nyuwe rebrand — same-named icon files changed, old caches must drop.
const VERSION = 'v8';
const SHELL_CACHE = 'tonse-shell-' + VERSION;
const FONT_CACHE = 'tonse-fonts-' + VERSION;
const IMG_CACHE = 'tonse-img-' + VERSION;
const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

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
            .filter(
              (k) =>
                k.startsWith('tonse-') &&
                k !== SHELL_CACHE &&
                k !== FONT_CACHE &&
                k !== IMG_CACHE
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      // Kick the asset warm-up AFTER claiming — deliberately not part of the
      // waitUntil chain's success (errors swallowed), so activation is never
      // held hostage by a slow network.
      .then(() => warmAssetCache())
      .catch(() => {})
  );
});

/**
 * Batched cache warm-up: pull each URL into the cache, a few at a time,
 * skipping anything already cached. Best-effort — a failed fetch is dropped
 * and the next activation resumes where this one left off.
 */
function warmInto(cache, urls) {
  let i = 0;
  const BATCH = 4;
  const next = () => {
    if (i >= urls.length) return Promise.resolve();
    const slice = urls.slice(i, i + BATCH);
    i += BATCH;
    return Promise.all(
      slice.map((url) =>
        cache
          .match(url)
          .then((hit) => (hit ? null : fetch(url).then((res) => {
            if (res && res.ok) return cache.put(url, res);
          })))
          .catch(() => {})
      )
    ).then(next);
  };
  return next();
}

/**
 * Background asset warm-up: fetch the build's asset manifest and pull every
 * bundled file the app needs offline into its cache. This is what makes
 * screens the user has NEVER visited work offline — runtime caching alone
 * only covers what the browser has already seen online. Shell (hashed JS/CSS)
 * warms first: without the bundle the app can't boot offline at all, so it
 * must land before the much larger image sweep starts. Images are small-first
 * in the manifest so the most of them land before the SW is ever killed.
 */
function warmAssetCache() {
  return fetch('/asset-manifest.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((manifest) => {
      const shell = manifest && Array.isArray(manifest.shell) ? manifest.shell : [];
      const images = manifest && Array.isArray(manifest.images) ? manifest.images : [];
      if (shell.length === 0 && images.length === 0) return;
      return caches
        .open(SHELL_CACHE)
        .then((cache) => warmInto(cache, shell))
        .then(() =>
          images.length
            ? caches.open(IMG_CACHE).then((cache) => warmInto(cache, images))
            : undefined
        );
    })
    .catch(() => {});
}

/**
 * Stale-while-revalidate: answer instantly from cache when possible, refresh
 * the cache in the background; fall back to cache when the network is down.
 * Used for content that should survive offline but may change occasionally
 * (Google Fonts, /uploads/ images like shop logos).
 */
function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          // Opaque responses (no-cors font stylesheets) are cacheable too.
          if (response && (response.ok || response.type === 'opaque')) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

// ── Offline app shell ─────────────────────────────────────────────────────

// Paths the SW must pass straight to the network: live data, encrypted secure
// files (/files/ — NEVER cached), and dev-server internals (so Vite/HMR never
// gets a stale cached module). The production API lives on another origin
// entirely and is already excluded by the origin check.
const NETWORK_ONLY_PREFIXES = [
  '/api/',
  '/files/',
  '/notifications/',
  '/src/',
  '/node_modules/',
  '/@vite',
  '/@react-refresh',
];

// The one cross-origin exception: Google Fonts (the stylesheet + woff2 files).
// Without caching these, offline pages lose their typography entirely.
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // Media/range requests must stream from the network untouched.
  if (request.headers.get('range')) return;

  const url = new URL(request.url);

  // IMAGES FIRST — keyed on the request TYPE, not the URL path. Uploaded images
  // render as <img src="/api/uploads/…">, and '/api/' is network-only below, so
  // a path-based rule never catches them. request.destination === 'image' is
  // set for <img>/CSS backgrounds regardless of origin or prefix, and is never
  // set for fetch()/SSE — so this caches every displayable image (api uploads,
  // /uploads, /assets, absolute API-host URLs) without ever touching live data.
  // Secure documents (/files/, encrypted) are excluded and stay network-only.
  if (request.destination === 'image' && !url.pathname.startsWith('/files/')) {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE));
    return;
  }

  // Cross-origin: fonts get stale-while-revalidate; everything else (the API,
  // CDNs) is untouched.
  if (url.origin !== self.location.origin) {
    if (FONT_ORIGINS.includes(url.origin)) {
      event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    }
    return;
  }

  if (NETWORK_ONLY_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // User uploads (shop logos, product images): fresh when online, cached when
  // not. Secure documents live under /files/ and never reach this route.
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

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
    payload = { title: 'Nyuwe Zambia', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Nyuwe Zambia';
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
        // Focus an already-open Nyuwe window and route it, if any.
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
