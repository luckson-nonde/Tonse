import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from './services/auth/authService';
import { tokenManager } from './services/api/client';
import { SubRole, EntityType } from './types';
import { generateVirtualAccount } from './utils/financeUtils';

// NOTE: pre-Phase-1, this file held a TOP_LEVEL_USER_KEYS whitelist and a
// splitProfileFields() helper that partitioned profile updates into top-level
// columns vs a metadata jsonb. Phase 1 promoted every field to a typed
// column on the users table, so the backend's UpdateUserDto is now the
// single source of truth for what's accepted. updateUser/register simply
// pass the data through.

// Phase 2 of the users-table restructure tightened the role enum to four
// canonical values. Business descriptors that used to live in role
// (EVENTS, ENTERTAINMENT, SUPPLIER, LABOUR) are now categories — they
// describe what the user trades in, not who they are. PROVIDER_STAFF is
// also gone; team members live as related rows under their parent provider.
export type Role = 'BUYER' | 'SELLER' | 'SERVICE_PROVIDER' | 'ADMIN';

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
  /** Whether a PIN has been set on the active profile. Backend
   * publishes this boolean in /auth/me + /auth/login + /users/:id
   * responses; the actual PIN value never leaves the server. */
  hasPin?: boolean;
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
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    role: string,
    nrc?: string,
    profilePicture?: string,
    dob?: string,
    /** Extra profile fields applied AFTER the registration call but BEFORE
     * the auto-login. Eliminates the race where Register.tsx's closure
     * captured a stale `user=null` updateUser, silently swallowing every
     * new registration's categories / subRole / location / area / lat/lng. */
    extraProfile?: Record<string, any>,
    /** Base64 data URL of the NRC document photo. Stored on the auth
     * row as users.nrcDocumentPath for admin verification. */
    nrcDocument?: string
  ) => Promise<void>;
  updateUser: (data: Record<string, any>) => Promise<void>;
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
          try {
            // Try to fetch current user from API
            const currentUser = await authService.getCurrentUser();

            if (!currentUser) {
              throw new Error('Invalid user response');
            }

            let pendingProfile = {};
            try {
              const stored = localStorage.getItem('pendingProfile');
              if (stored) pendingProfile = JSON.parse(stored);
            } catch (e) {}

            // Phase 1: every field is now a typed column on the user row,
            // so the response is already flat — no metadata jsonb to spread.
            const finalUser: User = {
              ...pendingProfile,
              ...(currentUser as any),
              id: currentUser.id || '',
              email: currentUser.email || '',
              name: currentUser.name || (pendingProfile as any).name || '',
              role: (currentUser.role as Role) || (pendingProfile as any).role || 'BUYER',
            };


            setUser(finalUser);
          } catch (apiError) {
            console.warn('Failed to fetch current user from API:', apiError);
            // Don't throw - let the app continue without initial user data
            // Try to restore from pending profile if available
            try {
              const stored = localStorage.getItem('pendingProfile');
              if (stored) {
                const pendingProfile = JSON.parse(stored);
                const finalPendingUser = {
                  id: 'pending',
                  email: pendingProfile.email || '',
                  name: pendingProfile.name || '',
                  role: (pendingProfile.role as Role) || 'BUYER',
                  ...pendingProfile,
                } as User;
                
                setUser(finalPendingUser);
              }
            } catch (e) {
              console.warn('Could not restore pending profile:', e);
            }
          }
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

      let pendingProfile = {};
      try {
        const stored = localStorage.getItem('pendingProfile');
        if (stored) pendingProfile = JSON.parse(stored);
      } catch (e) {}

      // Phase 1: every field is now a typed column on the user row, so the
      // response is already flat — no metadata jsonb to spread.
      const finalUser: User = {
        ...pendingProfile,
        ...(response.user as any),
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || (pendingProfile as any).name || '',
        role: (response.user.role as Role) || (pendingProfile as any).role || 'BUYER',
      };


      setUser(finalUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const register = React.useCallback(
    async (
      email: string,
      password: string,
      name: string,
      phone: string,
      role: string,
      nrc: string = '',
      profilePicture: string = '',
      dob: string = '',
      extraProfile?: Record<string, any>,
      nrcDocument: string = ''
    ) => {
      try {
        setError(null);
        // /auth/register issues access/refresh tokens AND the flattened user
        // in one shot. authService.register persists the tokens via
        // tokenManager so the immediately-following updateProfile call
        // attaches an authenticated Bearer header. Previously register
        // returned only the user, the post-register updateProfile call hit
        // the backend without a token, the apiClient 401 interceptor
        // force-redirected to /login, and the seller's onboarding died
        // before they could even reach the next step.
        const registerResponse = await authService.register({
          email,
          password,
          name,
          phone,
          role,
          nrc,
          profilePicture,
          dob,
          ...(nrcDocument ? { nrcDocument } : {}),
        });

        const newUserId = registerResponse?.user?.id;
        if (!newUserId) throw new Error('Registration response missing user id');

        // Apply the extra profile (categoryIds, location, subRole, etc.)
        // synchronously while we hold the registration tokens. After this
        // returns, the seller_profile_categories rows exist and the
        // archetype cache is computed.
        if (extraProfile && Object.keys(extraProfile).length > 0) {
          try {
            await authService.updateProfile(newUserId, extraProfile);
          } catch (e) {
            // Non-fatal — registration itself succeeded; user can complete
            // profile from settings if this update fails.
            console.warn('Failed to apply extra profile data after register:', e);
          }
        }

        // Pull the now-merged user (auth row flattened with the active
        // profile, including categoryIds and hasPin) so client state
        // mirrors the backend without firing /auth/login again. setUser
        // here keeps the user logged in across the rest of the
        // onboarding chain (Register → CompanyDocuments → …).
        let pendingProfile: Record<string, any> = {};
        try {
          const stored = localStorage.getItem('pendingProfile');
          if (stored) pendingProfile = JSON.parse(stored);
        } catch (e) {}

        try {
          const fresh = await authService.getCurrentUser();
          if (fresh) {
            setUser({
              ...pendingProfile,
              ...(fresh as any),
              id: fresh.id,
              email: fresh.email || email,
              name: fresh.name || name,
              role: (fresh.role as Role) || (role as Role),
            });
          } else {
            // Defensive fallback — if /auth/me returned nothing, hydrate
            // from the register response so the app at least knows who
            // is signed in.
            setUser({
              ...pendingProfile,
              ...(registerResponse.user as any),
              id: newUserId,
              email,
              name,
              role: role as Role,
            });
          }
        } catch (e) {
          setUser({
            ...pendingProfile,
            ...(registerResponse.user as any),
            id: newUserId,
            email,
            name,
            role: role as Role,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const updateUser = React.useCallback(
    async (data: Record<string, any>) => {
      if (!user) {
        throw new Error('No user logged in');
      }
      try {
        setError(null);

        // Phase 1: every field is now a typed column on users. The backend
        // UpdateUserDto is the single source of truth for what's accepted
        // — flat-pass the data through, no client-side partitioning.
        const response = await authService.updateProfile(user.id, data);

        // Merge: prevUser baseline, then locally-sent `data` so any
        // fields the backend hides via select:false still land in
        // client state, then the flattened backend `response` wins
        // last (it carries server-computed booleans like `hasPin` and
        // timestamps like updatedAt).
        //
        // Sensitive secrets are stripped from `data` before the merge —
        // we never want the literal PIN value in React state. The
        // server publishes `hasPin: boolean` for create-vs-verify
        // decisions and a /pin/verify endpoint for the compare itself.
        const { pin: _stripPin, ...nonSecretData } = data as any;
        setUser((prevUser) => {
          if (!prevUser) return null;
          return { ...prevUser, ...nonSecretData, ...response };
        });

        // Save to pendingProfile as well for redundancy
        try {
          const stored = localStorage.getItem('pendingProfile');
          const pending = stored ? JSON.parse(stored) : {};
          localStorage.setItem('pendingProfile', JSON.stringify({ ...pending, ...data }));
        } catch (e) {}
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Profile update failed';
        setError(errorMessage);
        throw err;
      }
    },
    [user]
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
      updateUser,
      logout,
      isLoading,
      isAuthenticated: !!user && authService.isAuthenticated(),
      error,
    }),
    [user, login, register, updateUser, logout, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
