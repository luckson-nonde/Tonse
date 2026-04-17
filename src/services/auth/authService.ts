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
}

export interface RegisterResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export const authService = {
  /**
   * Login with email and password
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
    const response = await apiClient.post<RegisterResponse>('/auth/register', userData);

    if (response.data) {
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
};
