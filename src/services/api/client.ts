/**
 * API Client with JWT Token Management
 * Simple API calls using v1
 */

// Base for all API calls. `/api` (set via VITE_API_URL) keeps requests
// same-origin so the Vite dev-server proxy can forward them to the NestJS
// backend on :3001 — this is what lets the public Cloudflare tunnel reach
// the backend through the single exposed frontend port, with no CORS.
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3001';

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

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

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

  // Check if token is expired and refresh if needed
  if (accessToken && tokenManager.isTokenExpired(accessToken)) {
    try {
      const { accessToken: newAccessToken } = await refreshAccessToken();
      accessToken = newAccessToken;
    } catch (error) {
      tokenManager.clearTokens();
      window.location.href = '/login';
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
      tokenManager.clearTokens();
      window.location.href = '/login';
      throw new Error('Unauthorized. Please login again.');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined } as any;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
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
