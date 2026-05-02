import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from './services/auth/authService';
import { tokenManager } from './services/api/client';
import { SubRole, EntityType } from './types';
import { generateVirtualAccount } from './utils/financeUtils';

// Single source of truth for which profile fields the backend's User entity
// stores as top-level columns vs which roll into the metadata jsonb. Used by
// both updateUser (post-login profile edits) and register (the new
// extraProfile path that bypasses the closure race during onboarding).
const TOP_LEVEL_USER_KEYS = [
  'name',
  'email',
  'phone',
  'nrc',
  'profilePicture',
  'location',
  'role',
  'categories',
  'verificationStatus',
  'businessLicenseId',
  'socialLinks',
  'isActive',
  'pin',
];

function splitProfileFields(
  data: Record<string, any>,
  existingMetadata: Record<string, any> = {}
): { topLevelData: Record<string, any>; metadata: Record<string, any> } {
  const topLevelData: Record<string, any> = {};
  const metadata: Record<string, any> = { ...existingMetadata };
  Object.keys(data).forEach((key) => {
    if (TOP_LEVEL_USER_KEYS.includes(key)) {
      topLevelData[key] = data[key];
    } else {
      metadata[key] = data[key];
    }
  });
  return { topLevelData, metadata };
}

export type Role =
  | 'BUYER'
  | 'SELLER'
  | 'SUPPLIER'
  | 'SERVICE_PROVIDER'
  | 'ENTERTAINMENT'
  | 'EVENTS'
  | 'PROVIDER_STAFF'
  | 'LABOUR'
  | 'ADMIN';

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
    extraProfile?: Record<string, any>
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

            // Flatten metadata if it exists
            const { metadata, ...userData } = currentUser as any;

            const finalUser: User = {
              ...pendingProfile,
              ...userData,
              ...(metadata || {}),
              metadata,
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

      // Flatten metadata if it exists
      const { metadata, ...userData } = response.user as any;

      const finalUser: User = {
        ...pendingProfile,
        ...userData,
        ...(metadata || {}),
        metadata,
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
      extraProfile?: Record<string, any>
    ) => {
      try {
        setError(null);
        // Register with identity verification fields (NRC, profile picture, and DOB)
        const registerResponse = await authService.register({
          email,
          password,
          name,
          phone,
          role,
          nrc,
          profilePicture,
          dob,
        });

        // Apply extra profile fields (categories, subRole, location, area,
        // province, city, latitude, longitude, radius, etc.) to the brand-new
        // user record BEFORE the auto-login. Done synchronously here so we
        // bypass the closure race where Register.tsx's updateUser ref still
        // pointed at user=null when called immediately after register().
        // RegisterResponse is flat — { id, email, name, role } — so we read
        // .id directly, not .user.id.
        const newUserId = registerResponse?.id;
        if (newUserId && extraProfile && Object.keys(extraProfile).length > 0) {
          const { topLevelData, metadata } = splitProfileFields(extraProfile);
          const payload: Record<string, any> = { ...topLevelData };
          if (Object.keys(metadata).length > 0) payload.metadata = metadata;
          try {
            await authService.updateProfile(newUserId, payload);
          } catch (e) {
            // Non-fatal — registration itself succeeded; user can complete
            // profile from settings if this update fails.
            console.warn('Failed to apply extra profile data after register:', e);
          }
        }

        // Auto-login after registration. By this point the backend record
        // already has every field, so AuthContext.user lands fully populated.
        await login(email, password);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        throw err;
      }
    },
    [login]
  );

  const updateUser = React.useCallback(
    async (data: Record<string, any>) => {
      if (!user) {
        throw new Error('No user logged in');
      }
      try {
        setError(null);

        // Separate top-level fields from metadata using the shared helper.
        // The list of top-level keys lives at the top of this file so the
        // register() flow uses the same partitioning.
        const { topLevelData, metadata } = splitProfileFields(data, (user as any).metadata);

        // Send to backend
        const payload: Record<string, any> = { ...topLevelData };
        if (Object.keys(metadata).length > 0) {
          payload.metadata = metadata;
        }

        const response = await authService.updateProfile(user.id, payload);

        // Update local user state with flattened metadata
        const { metadata: updatedMetadata, ...rest } = response;
        setUser((prevUser) => {
          if (!prevUser) return null;
          const finalUser = { ...prevUser, ...rest, ...updatedMetadata, metadata: updatedMetadata };
          return finalUser;
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
