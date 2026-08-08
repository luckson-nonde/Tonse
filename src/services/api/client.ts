/**
 * API Client with JWT Token Management
 * Simple API calls using v1
 */

import { enqueueWrite } from '../offlineWriteQueue';
import {
  getCachedResponse,
  isCacheableEndpoint,
  purgeUserCache,
  setCachedResponse,
} from '../offlineReadCache';

// Base for all API calls. `/api` (set via VITE_API_URL) keeps requests
// same-origin so the Vite dev-server proxy can forward them to the NestJS
// backend on :3001 — this is what lets the public Cloudflare tunnel reach
// the backend through the single exposed frontend port, with no CORS.
//
// The Render blueprint wires VITE_API_URL from the API service's `host`, which
// carries no scheme. Normalize: a leading '/' stays same-origin (dev proxy /
// nginx), a full URL is used as-is, and a bare host gets https:// prepended so
// fetch() resolves it absolutely instead of relative to the static site.
const rawApiBase = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3001';
export const API_BASE_URL =
  /^https?:\/\//.test(rawApiBase) || rawApiBase.startsWith('/')
    ? rawApiBase
    : `https://${rawApiBase}`;

/**
 * Make a stored upload path renderable.
 *
 * `POST /files/upload` returns a bare `/uploads/…` path, which resolves against
 * the WEB origin — a different service from the API in production, so it 404s.
 * (And a 404 on /uploads/* surfaces in the browser as
 * ERR_BLOCKED_BY_RESPONSE.NotSameOrigin, because only files that are FOUND get
 * the permissive Cross-Origin-Resource-Policy header — the CORP error is always
 * a symptom of the 404, never a separate bug.)
 *
 * Absolute/data/blob URLs pass through untouched, so this is safe to apply to a
 * field that might already hold either.
 *
 * NOTE: product `images` are base64 data URLs written client-side, not uploads
 * — they render directly and don't need this.
 */
export function uploadUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  statusCode?: number;
  error?: string;
  /** Set when this response was served from the offline read cache. */
  fromCache?: boolean;
  /** When the cached copy was originally fetched (ms epoch). */
  cachedAt?: number;
}

/**
 * Opt-in marker that turns a mutation into a QUEUEABLE write: if it can't reach
 * the server (offline, or the fetch throws mid-flight), it's persisted to the
 * offline write queue and replayed automatically once connectivity returns,
 * instead of failing outright. Only the few call sites that pass this get the
 * behavior — every other mutation keeps failing fast exactly as before.
 */
export interface QueueableOptions {
  /** Stable per-attempt key. Sent as `Idempotency-Key` on the LIVE attempt too
   *  (not just replays), so a request that reached the server but whose response
   *  was lost can't double-apply on retry. */
  idempotencyKey: string;
  /** Human label shown in OfflineBanner's "waiting to sync" list. */
  label: string;
  /** Fired on the window after a successful replay so existing hooks refetch. */
  changedEvent?: 'tonse:inquiries-changed' | 'tonse:quotes-changed';
}

/** apiCall options: a normal RequestInit plus the optional queueable marker. */
export type ApiCallOptions = RequestInit & {
  queueable?: QueueableOptions;
  /**
   * Stale-while-revalidate for GETs: serve the offline read cache's copy
   * IMMEDIATELY when one exists (tagged fromCache), and refresh it over the
   * network in the background — dispatching `tonse:data-revalidated` if the
   * fresh data differs, so mounted feed hooks refetch and pick it up. Opt-in
   * per call site: a refetch that must PROVE a mutation (delete, accept)
   * needs the live answer and must NOT set this.
   */
  swr?: boolean;
};

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Token management
export const tokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem('access_token');
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem('refresh_token');
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  clearTokens: (): void => {
    // Capture the outgoing user BEFORE removing the token — the offline read
    // cache purge needs their `sub`, and it's gone once the token is cleared.
    const outgoingToken = localStorage.getItem('access_token');
    const outgoingUserId = outgoingToken
      ? tokenManager.getTokenPayload(outgoingToken)?.sub
      : undefined;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // The offline session cache is only valid alongside its tokens — every
    // path that ends the session (logout, real 401, rejected refresh) lands
    // here, so this is the single cleanup point.
    localStorage.removeItem('tonse_user_cache');
    if (outgoingUserId) void purgeUserCache(outgoingUserId);
  },

  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch {
      return true;
    }
  },

  getTokenPayload: (token: string): any => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  },
};

// ── Stale-while-revalidate ──────────────────────────────────────────────────

/** Endpoints with a background refresh already in flight — one per endpoint. */
const revalidating = new Set<string>();

/**
 * Background half of SWR: re-run the GET over the network, and if the answer
 * differs from what was just served from cache, persist it and broadcast
 * `tonse:data-revalidated` so every mounted hook for this data refetches.
 * Loop-safe by construction:
 *  - the inner apiCall strips `swr`, so it always goes to the network;
 *  - a fromCache result means the network is down (the inner call fell back
 *    to the same cache) — no event, or offline polls would loop forever;
 *  - listeners' refetches serve the now-fresh cache, so their confirmatory
 *    revalidation finds no diff and goes quiet.
 */
async function revalidate(
  endpoint: string,
  options: ApiCallOptions,
  served: any
): Promise<void> {
  if (revalidating.has(endpoint)) return;
  revalidating.add(endpoint);
  try {
    const fresh = await apiCall(endpoint, { ...options, swr: undefined });
    if (fresh.fromCache) return;
    if (JSON.stringify(fresh) !== JSON.stringify(served)) {
      // The inner call's own cache write is fire-and-forget — write again and
      // AWAIT it so the cache is durably fresh before any listener refetches.
      await setCachedResponse(endpoint, fresh);
      window.dispatchEvent(
        new CustomEvent('tonse:data-revalidated', { detail: { endpoint } })
      );
    }
  } catch {
    // Background refresh — the user already has the cached copy on screen.
  } finally {
    revalidating.delete(endpoint);
  }
}

// Refresh token logic
let refreshPromise: Promise<TokenPair> | null = null;

const refreshAccessToken = async (): Promise<TokenPair> => {
  // Prevent multiple simultaneous refresh requests
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Distinguish "the server REJECTED the refresh" (session truly dead)
      // from "the network is DOWN" (session merely unreachable). A fetch
      // throw here must never destroy a still-valid refresh token.
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshToken}`,
          },
        });
      } catch (networkErr) {
        const err = new Error('Network unreachable during token refresh');
        err.name = 'NetworkError';
        throw err;
      }

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = data;

      tokenManager.setTokens(accessToken, newRefreshToken);
      return { accessToken, refreshToken: newRefreshToken };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Main request function with JWT
export const apiCall = async <T = any>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> => {
  let accessToken = tokenManager.getAccessToken();

  // `queueable` is our own field, not a fetch() option — pull it out so the
  // rest of the request builds from a clean RequestInit.
  const { queueable, ...fetchInit } = options;

  // Persist this write to the offline queue and signal the caller with a
  // distinct `QueuedWrite` error, so its catch block can show "saved, will send
  // later" instead of a hard failure. Only reachable when `queueable` is set.
  const queueAndSignal = (methodUpper: string): never => {
    enqueueWrite({
      id: queueable!.idempotencyKey,
      endpoint,
      method: methodUpper as any,
      body: typeof fetchInit.body === 'string' ? fetchInit.body : undefined,
      label: queueable!.label,
      changedEvent: queueable!.changedEvent,
    });
    const err = new Error(
      "You're offline — saved. This will send automatically once you're back online."
    );
    err.name = 'QueuedWrite';
    throw err;
  };

  // Pre-auth flows (the registration wizard, role selection, login) legitimately
  // fire best-effort AUTHENTICATED calls before any session exists — onboarding
  // CONSENT recording is the main one — so a 401 there is an expected miss, not
  // a dead session. In those places we must NOT hard-redirect to /login: that
  // reloads the page and discards the user's half-filled form (the exact bug
  // where registration "refreshes halfway on the location / account-creation
  // step and bounces to login"). Let the call reject instead so the caller's
  // own try/catch swallows it; authenticated app routes keep the bounce.
  //
  // /discover is the same class of bug, one level worse: it's a genuinely
  // PUBLIC route (LandingGate only gates it on the site-settings flag, never
  // on auth state), so AuthContext's boot-time session check runs there for
  // every guest. A visitor with a stale/expired token from an earlier session
  // on this browser would otherwise get hard-redirected to /login the instant
  // they land on Discover — typing the URL back in "still brings you back to
  // login" is exactly this. Prefix match covers /discover/:id too.
  const authFlowPath =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/register' ||
      window.location.pathname === '/role-selection' ||
      window.location.pathname === '/login' ||
      window.location.pathname.startsWith('/forgot-password') ||
      window.location.pathname.startsWith('/reset-password') ||
      window.location.pathname.startsWith('/discover') ||
      // Public ticket purchase (/e/:code) — a guest with a stale token from a
      // previous session must not be yanked to /login mid-purchase.
      window.location.pathname.startsWith('/e/'));

  // Offline fail-fast for MUTATIONS: a write that can't reach the server is
  // not "pending", it's not happening — say so immediately and honestly
  // instead of a hung request + generic failure. GETs still proceed so the
  // service worker / HTTP cache can answer them. EXCEPTION: a `queueable` write
  // is genuinely "pending" — persist it and signal QueuedWrite instead.
  const method = (options.method || 'GET').toUpperCase();

  // Stale-while-revalidate (opt-in): serve the cached copy NOW — before the
  // token-refresh block, so a stale paint never waits on auth round-trips —
  // and refresh it in the background. Cache miss falls through to the normal
  // network path unchanged.
  if (method === 'GET' && options.swr && isCacheableEndpoint(endpoint)) {
    const cached = await getCachedResponse(endpoint);
    if (cached) {
      void revalidate(endpoint, options, cached.response);
      return { ...cached.response, fromCache: true, cachedAt: cached.cachedAt };
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine && method !== 'GET') {
    if (queueable) queueAndSignal(method);
    throw new Error("You're offline — this needs a connection. Your change was not saved.");
  }

  // Check if token is expired and refresh if needed
  if (accessToken && tokenManager.isTokenExpired(accessToken)) {
    try {
      const { accessToken: newAccessToken } = await refreshAccessToken();
      accessToken = newAccessToken;
    } catch (error) {
      // Network down ≠ session dead: keep the refresh token, surface a soft
      // error, and let the session resume when connectivity returns. A GET
      // can still be answered from the offline read cache — without this,
      // an expired-token GET while offline dies before fetch ever runs.
      if ((error as Error)?.name === 'NetworkError') {
        if (method === 'GET') {
          const cached = await getCachedResponse(endpoint);
          if (cached) {
            return { ...cached.response, fromCache: true, cachedAt: cached.cachedAt };
          }
        }
        throw new Error("You're offline — reconnect to continue.");
      }
      tokenManager.clearTokens();
      if (!authFlowPath) window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  // Build headers with JWT. For a FormData body, DON'T set Content-Type —
  // the browser must set `multipart/form-data; boundary=...` itself, or the
  // backend can't parse the upload. Only JSON bodies get the explicit header.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headersInit: HeadersInit = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  if (typeof options.headers === 'object' && options.headers !== null) {
    Object.entries(options.headers).forEach(([key, value]) => {
      (headersInit as any)[key] = value;
    });
  }

  if (accessToken) {
    (headersInit as any).Authorization = `Bearer ${accessToken}`;
  }

  // Idempotency-Key on the live attempt AND every replay: the server dedupes
  // by this key, so a queued write that actually reached the server (but whose
  // response we never saw) can't create a duplicate when it replays.
  if (queueable) {
    (headersInit as any)['Idempotency-Key'] = queueable.idempotencyKey;
  }
  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchInit,
        headers: headersInit,
      });
    } catch (networkErr) {
      // fetch() only throws on a genuine network failure (offline mid-request,
      // DNS, dropped connection) — never on an HTTP error status. Tag it as
      // NetworkError so the queue drainer and AuthContext can tell "unreachable"
      // apart from a real rejection; queue it if this write opted in. A GET
      // falls back to the offline read cache before failing — HTTP errors
      // (401/4xx/5xx) never reach this catch and are always surfaced live.
      if (queueable && method !== 'GET') queueAndSignal(method);
      if (method === 'GET') {
        const cached = await getCachedResponse(endpoint);
        if (cached) {
          return { ...cached.response, fromCache: true, cachedAt: cached.cachedAt };
        }
      }
      const err = new Error("You're offline — couldn't reach the server.");
      err.name = 'NetworkError';
      throw err;
    }

    // Handle 401 Unauthorized (token might be invalid).
    // Skip the bounce-to-login redirect when the failing call IS the auth
    // attempt itself — wrong credentials are an expected outcome of
    // /auth/login, not a session-expired condition. Falling through lets
    // the backend's error body ("invalid credentials") reach the caller's
    // catch block instead of a hard page reload.
    const isAuthAttempt = /^\/auth\/(login|register|refresh)/.test(endpoint);
    if (response.status === 401 && !isAuthAttempt) {
      // Only a genuine authenticated-session 401 clears tokens and bounces to
      // /login. On a pre-auth flow (see authFlowPath above) the 401 is an
      // expected best-effort miss — let it reject so the caller handles it,
      // without a page-reloading redirect that drops the registration form.
      if (!authFlowPath) {
        tokenManager.clearTokens();
        window.location.href = '/login';
      }
      throw new Error('Unauthorized. Please login again.');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined } as any;
    }

    // Parse defensively — a 5xx (e.g. an upstream/proxy error when the API
    // is down) can arrive with an EMPTY or non-JSON body, and
    // response.json() would throw a cryptic "Unexpected end of JSON input".
    // Read text first, then parse only if there's something to parse.
    const raw = await response.text();
    let data: any = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }
    }

    if (!response.ok) {
      // class-validator failures arrive as an ARRAY of messages; String(array)
      // comma-jams them ("too short,must be a string") — join them readably.
      const message = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message;
      throw new Error(
        message ||
          (response.status >= 500
            ? 'The server had a problem. Please try again in a moment.'
            : `Request failed (${response.status}).`)
      );
    }

    // Feed the offline read cache (fire-and-forget — never blocks the caller).
    // Only 2xx GETs land here: 204 early-returned above, errors threw.
    if (method === 'GET' && isCacheableEndpoint(endpoint)) {
      void setCachedResponse(endpoint, data);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Convenience methods
export const apiClient = {
  get: <T = any>(endpoint: string, options?: ApiCallOptions) =>
    apiCall<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: ApiCallOptions) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'POST',
      // Pass FormData straight through (uploads); JSON-encode everything else.
      body:
        typeof FormData !== 'undefined' && body instanceof FormData
          ? body
          : body
          ? JSON.stringify(body)
          : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: ApiCallOptions) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: ApiCallOptions) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: ApiCallOptions) =>
    apiCall<T>(endpoint, { ...options, method: 'DELETE' }),
};
