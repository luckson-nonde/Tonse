import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './db';

export type Role = 'BUYER' | 'SELLER' | 'SUPPLIER' | 'SERVICE_PROVIDER' | 'ENTERTAINMENT' | 'EVENTS';

export interface User {
  id?: number;
  role: Role;
  name: string;
  email: string;
  phone: string;
  nrc: string;
  location: string;
  password?: string;
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
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  pin?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (userData: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for logged in user
    const storedUserId = localStorage.getItem('auth_user_id');
    if (storedUserId) {
      db.users.get(Number(storedUserId)).then(foundUser => {
        if (foundUser) {
          setUser(foundUser);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string) => {
    const foundUser = await db.users.where('email').equals(email).first();
    if (!foundUser) {
      throw new Error('User not found');
    }
    if (password && foundUser.password !== password) {
      throw new Error('Invalid credentials');
    }
    setUser(foundUser);
    if (foundUser.id) {
      localStorage.setItem('auth_user_id', foundUser.id.toString());
    }
  };

  const register = async (userData: User) => {
    const existingUser = await db.users.where('email').equals(userData.email).first();
    if (existingUser) {
      throw new Error('Email already in use');
    }

    let newUser: User | null = null;

    await db.transaction('rw', db.users, db.shops, async () => {
      const id = await db.users.add(userData);
      newUser = { ...userData, id };

      // Create a shop entry for providers
      if (['SELLER', 'SUPPLIER', 'SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS'].includes(userData.role)) {
        await db.shops.add({
          providerId: id,
          name: userData.name,
          logo: userData.logo || '',
          coverImage: userData.coverImage || 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80',
          description: 'New shop on TONSE Marketplace',
          category: userData.categories?.[0] || 'General',
          location: userData.location || 'Zambia',
          rating: 5,
          reviewCount: 0,
          isVerified: false,
          registrationDate: Date.now(),
          registrationDocuments: [],
          proofPhotos: []
        });
      }
    });

    if (newUser && newUser.id) {
      setUser(newUser);
      localStorage.setItem('auth_user_id', newUser.id.toString());
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user || !user.id) return;
    const updatedUser = { ...user, ...updates };
    await db.users.update(user.id, updates);
    
    // Also update shop if user is a provider
    if (['SELLER', 'SUPPLIER', 'SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS'].includes(user.role)) {
      const shop = await db.shops.where('providerId').equals(user.id).first();
      if (shop && shop.id) {
        await db.shops.update(shop.id, {
          facebookLink: updates.facebookLink || user.facebookLink,
          tiktokLink: updates.tiktokLink || user.tiktokLink,
          whatsappLink: updates.whatsappLink || user.whatsappLink,
          registrationDocuments: updates.businessDocs || user.businessDocs
        });
      }
    }
    
    setUser(updatedUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user_id');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
