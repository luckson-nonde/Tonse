/**
 * API Client with JWT Token Management
 * Simple API calls using v1
 */

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

interface ApiResponse<T> {
  data?: T;
  message?: string;
  statusCode?: number;
  error?: string;
}

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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // The offline session cache is only valid alongside its tokens — every
    // path that ends the session (logout, real 401, rejected refresh) lands
    // here, so this is the single cleanup point.
    localStorage.removeItem('tonse_user_cache');
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
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  let accessToken = tokenManager.getAccessToken();

  // Pre-auth flows (the registration wizard, role selection, login) legitimately
  // fire best-effort AUTHENTICATED calls before any session exists — onboarding
  // CONSENT recording is the main one — so a 401 there is an expected miss, not
  // a dead session. In those places we must NOT hard-redirect to /login: that
  // reloads the page and discards the user's half-filled form (the exact bug
  // where registration "refreshes halfway on the location / account-creation
  // step and bounces to login"). Let the call reject instead so the caller's
  // own try/catch swallows it; authenticated app routes keep the bounce.
  const authFlowPath =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/register' ||
      window.location.pathname === '/role-selection' ||
      window.location.pathname === '/login' ||
      window.location.pathname.startsWith('/forgot-password') ||
      window.location.pathname.startsWith('/reset-password'));

  // Offline fail-fast for MUTATIONS: a write that can't reach the server is
  // not "pending", it's not happening — say so immediately and honestly
  // instead of a hung request + generic failure. GETs still proceed so the
  // service worker / HTTP cache can answer them.
  const method = (options.method || 'GET').toUpperCase();
  if (typeof navigator !== 'undefined' && !navigator.onLine && method !== 'GET') {
    throw new Error("You're offline — this needs a connection. Your change was not saved.");
  }

  // Check if token is expired and refresh if needed
  if (accessToken && tokenManager.isTokenExpired(accessToken)) {
    try {
      const { accessToken: newAccessToken } = await refreshAccessToken();
      accessToken = newAccessToken;
    } catch (error) {
      // Network down ≠ session dead: keep the refresh token, surface a soft
      // error, and let the session resume when connectivity returns.
      if ((error as Error)?.name === 'NetworkError') {
        throw new Error("You're offline — reconnect to continue.");
      }
      tokenManager.clearTokens();
      if (!authFlowPath) window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  // Build headers with JWT
  const headersInit: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (typeof options.headers === 'object' && options.headers !== null) {
    Object.entries(options.headers).forEach(([key, value]) => {
      (headersInit as any)[key] = value;
    });
  }

  if (accessToken) {
    (headersInit as any).Authorization = `Bearer ${accessToken}`;
  }
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: headersInit,
    });

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
      throw new Error(
        data?.message ||
          (response.status >= 500
            ? 'The server had a problem. Please try again in a moment.'
            : `Request failed (${response.status}).`)
      );
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Convenience methods
export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiCall<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiCall<T>(endpoint, { ...options, method: 'DELETE' }),
};
