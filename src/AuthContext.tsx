import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from './services/auth/authService';
import { tokenManager } from './services/api/client';
import { SubRole, EntityType } from './types';

export type Role = 'BUYER' | 'SELLER' | 'SUPPLIER' | 'SERVICE_PROVIDER' | 'ENTERTAINMENT' | 'EVENTS' | 'PROVIDER_STAFF' | 'LABOUR';

export interface User {
  id: string;
  role: Role;
  subRole?: SubRole;
  labourCategory?: string;
  labourSubTypes?: string[];
  entityType?: EntityType;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  nrc?: string;
  tpin?: string;
  incorporationCertUrl?: string;
  location?: string;
  categories?: string[];
  businessDocs?: string[];
  socialMediaLink?: string;
  facebookLink?: string;
  tiktokLink?: string;
  whatsappLink?: string;
  storePhotos?: {
    front?: string;
    interior?: string;
  };
  logo?: string;
  coverImage?: string;
  latitude?: number;
  longitude?: number;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'INCOMPLETE';
  pin?: string;
  parentProviderId?: number;
  permissions?: string[];
  mustChangePassword?: boolean;
  createdAt?: string;
  virtualAccountNumber?: string;
  virtualAccountBalance?: number;
  availabilityStatus?: 'AVAILABLE' | 'NOT_AVAILABLE';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount - check if there's a valid token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = tokenManager.getAccessToken();
        if (accessToken && !tokenManager.isTokenExpired(accessToken)) {
          // Try to fetch current user from API
          const currentUser = await authService.getCurrentUser();
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name || '',
            role: (currentUser.role as Role) || 'BUYER',
          });
        } else if (accessToken) {
          // Token expired, clear it
          tokenManager.clearTokens();
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        tokenManager.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      const response = await authService.login(email, password);
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: (response.user.role as Role) || 'BUYER',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const register = React.useCallback(
    async (email: string, password: string, name: string, phone: string, role: string) => {
      try {
        setError(null);
        await authService.register({ email, password, name, phone, role });
        // Auto-login after registration
        await login(email, password);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        throw err;
      }
    },
    [login]
  );

  const logout = React.useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if API call fails
      setUser(null);
      tokenManager.clearTokens();
    }
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      isLoading,
      isAuthenticated: !!user && authService.isAuthenticated(),
      error,
    }),
    [user, login, register, logout, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
