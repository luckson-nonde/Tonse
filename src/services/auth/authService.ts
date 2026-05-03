/**
 * Authentication Service
 * Handles login, register, logout, and token refresh with the backend
 */

import { apiClient, tokenManager } from '../api/client';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: string;
  nrc?: string;
  profilePicture?: string;
  /** Base64 data URL of the NRC document photo. Lands on
   * users.nrcDocumentPath; admins use it to verify the NRC number. */
  nrcDocument?: string;
  dob?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  /** Access / refresh tokens issued at register time so the client can
   *  immediately authenticate follow-up onboarding writes (updateProfile,
   *  category junction writes) without a separate /auth/login round-trip. */
  accessToken?: string;
  refreshToken?: string;
  // Backend returns the freshly-flattened user (auth row merged with the
  // active profile).
  user: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
    [key: string]: any;
  };
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface UpdateProfileRequest {
  [key: string]: any;
}

export const authService = {
  /**
   * Login with email and password only
   *
   * NRC and phone are used for identity verification during registration only,
   * not for login credentials.
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    if (response.data) {
      const { accessToken, refreshToken } = response.data;
      tokenManager.setTokens(accessToken, refreshToken);
      return response.data;
    }

    throw new Error(response.message || 'Login failed');
  },

  /**
   * Register a new user
   */
  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    // Sanitize data: remove empty dob if it's not a valid date string to avoid ISO 8601 validation errors
    const sanitizedData = { ...userData };
    if (!sanitizedData.dob || sanitizedData.dob === '') {
      delete sanitizedData.dob;
    }

    const response = await apiClient.post<RegisterResponse>('/auth/register', sanitizedData);

    if (response.data) {
      // Persist the tokens issued by /auth/register so the very next
      // authenticated call (post-register updateProfile, junction
      // writes) attaches a Bearer header. Without this the client
      // would get 401, the apiClient interceptor would clear tokens
      // and force-redirect to /login, and the seller's onboarding
      // would die mid-flow.
      const { accessToken, refreshToken } = response.data;
      if (accessToken && refreshToken) {
        tokenManager.setTokens(accessToken, refreshToken);
      }
      return response.data;
    }

    throw new Error(response.message || 'Registration failed');
  },

  /**
   * Get current logged-in user
   */
  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    const response = await apiClient.get<CurrentUserResponse>('/auth/me');

    if (response.data) {
      return response.data;
    }

    throw new Error('Failed to fetch current user');
  },

  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post('/auth/refresh', {});

    if (response.data) {
      const { accessToken, refreshToken } = response.data;
      tokenManager.setTokens(accessToken, refreshToken);
      return { accessToken, refreshToken };
    }

    throw new Error('Failed to refresh token');
  },

  /**
   * Logout and clear tokens
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      tokenManager.clearTokens();
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const token = tokenManager.getAccessToken();
    if (!token) return false;
    return !tokenManager.isTokenExpired(token);
  },

  /**
   * Get user from token without API call
   */
  getUserFromToken: (): CurrentUserResponse | null => {
    const token = tokenManager.getAccessToken();
    if (!token) return null;

    const payload = tokenManager.getTokenPayload(token);
    if (!payload) return null;

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  },

  /**
   * Update user profile
   */
  /**
   * Verify a candidate PIN against the active profile's stored PIN.
   * Server-side compare — the actual PIN never travels back to the
   * client. Returns true on match, false on mismatch (or no PIN set).
   */
  verifyPin: async (userId: string, pin: string): Promise<boolean> => {
    const response = await apiClient.post<{ valid: boolean }>(
      `/users/${userId}/pin/verify`,
      { pin }
    );
    return !!response.data?.valid;
  },

  updateProfile: async (userId: string, data: UpdateProfileRequest): Promise<any> => {
    // Sanitize data: remove empty dob to avoid validation errors. Phase 1
    // dropped the metadata jsonb so dob (when present) is at the top level
    // — no nested metadata.dob check anymore.
    const sanitizedData = { ...data };
    if (!sanitizedData.dob || sanitizedData.dob === '') {
      delete sanitizedData.dob;
    }

    const response = await apiClient.patch<any>(`/users/${userId}`, sanitizedData);

    if (response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Profile update failed');
  },
};
