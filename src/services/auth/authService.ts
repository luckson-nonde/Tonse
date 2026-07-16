/**
 * Authentication Service
 * Handles login, register, logout, and token refresh with the backend
 */

import { apiClient, tokenManager } from '../api/client';

/**
 * Result of the pre-deletion safety check (GET /users/:id/deletion-check).
 * `canDelete` is false only when funds sit in escrow (a hard block); the
 * `warnings` counts never block deletion but are surfaced so the user can
 * decide whether to proceed.
 */
export interface DeletionCheck {
  canDelete: boolean;
  hardBlocks: {
    sellerCollections: { count: number; amount: number };
    buyerEscrow: { count: number; amount: number };
  };
  warnings: {
    inProgressOrders: number;
    pendingOffers: number;
    openInquiries: number;
    incompleteLoans: number;
  };
}

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
  /** Stable category IDs for sellers / service-providers. Seeded into
   * the profile + seller_profile_categories at registration time so
   * matching is live the moment the seller logs in. */
  categoryIds?: string[];
  /** Optional sub-role hint (PRODUCT_SELLER / SUPPLIER_SELLER / etc.). */
  subRole?: string;
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
   * Check whether an email is still available (not already registered).
   * Used by the registration form to validate the email against the DB on
   * blur, so the user isn't sent back from the final step for a duplicate.
   */
  checkEmailAvailable: async (email: string): Promise<boolean> => {
    const response = await apiClient.get<{ available: boolean }>(
      `/auth/check-email?email=${encodeURIComponent(email)}`
    );
    // Default to available on an unexpected shape so we never falsely block.
    return response.data?.available ?? true;
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

  /**
   * Set (or change) the calling user's PIN. The backend routes the
   * write to users.pin for staff (parentProviderId set, Phase 5
   * department-head model) and to the active profile for owners —
   * caller doesn't have to branch.
   */
  setPin: async (userId: string, pin: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/pin`, { pin });
  },

  /**
   * Change the calling user's password. Used by the ForcePasswordChange
   * flow on first login (when mustChangePassword=true). Backend
   * bcrypt-hashes the value and clears mustChangePassword in the
   * same write. Routes through a dedicated endpoint instead of the
   * generic update path so passwords never land unhashed.
   */
  changePassword: async (userId: string, password: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/password`, { password });
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

  /**
   * Pre-deletion safety check. Reports whether the signed-in user's account
   * can be erased and what stands in the way — hard blocks (funds held in
   * escrow) vs soft warnings (open orders/offers/inquiries/loans). Drives the
   * block/warn UX before the user commits. Self-only on the backend.
   */
  checkDeletion: async (userId: string): Promise<DeletionCheck> => {
    const response = await apiClient.get<DeletionCheck>(`/users/${userId}/deletion-check`);
    return (
      response.data ?? {
        canDelete: true,
        hardBlocks: {
          sellerCollections: { count: 0, amount: 0 },
          buyerEscrow: { count: 0, amount: 0 },
        },
        warnings: { inProgressOrders: 0, pendingOffers: 0, openInquiries: 0, incompleteLoans: 0 },
      }
    );
  },

  /**
   * Permanently delete the signed-in user's account and ALL their data.
   * Self-only on the backend (DELETE /users/:id). Irreversible. Blocked (409)
   * while funds are held in escrow — resolve the pending collection(s) first.
   */
  deleteAccount: async (userId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}`);
  },
};
