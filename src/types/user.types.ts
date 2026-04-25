// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  nrc?: string;
  location?: string;
  role: UserRole;
  categories: string[];
  verificationStatus: VerificationStatus;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  SUPPLIER = 'SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  ENTERTAINMENT = 'ENTERTAINMENT',
  EVENTS = 'EVENTS',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: UserRole;
  categories: string[];
  ratings?: number;
  followers?: number;
}
