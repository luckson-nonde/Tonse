export interface InquiryItem {
  id?: string;
  title: string;
  description: string;
  brand?: string;
  condition?: string;
  material?: string;
  dimensions?: string;
  finish?: string;
  quantity: number;
  urgency?: string;
  images?: string[];
}

export interface Inquiry {
  id?: number;
  title: string;
  description: string;
  items: InquiryItem[];
  category: string;
  location: string;
  buyerName: string;
  buyerId: number;
  createdAt: number;
  status: 'OPEN' | 'CLOSED';
  viewCount?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  preferences?: {
    brand?: string;
    condition?: string;
    urgency?: string;
  };
  attributes?: Record<string, any>;
  // Legacy fields for backward compatibility
  entertainmentData?: any;
  repairData?: any;
}

export interface Quote {
  id?: number;
  inquiryId: number;
  inquiryTitle: string;
  providerId: number;
  providerName: string;
  price: number;
  condition: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ARCHIVED' | 'PAID' | 'PENDING_COLLECTION' | 'COMPLETED';
  createdAt: number;
  expiryDuration?: string;
  isRead?: boolean;
  itemPrices?: { itemId: string | number; price: number }[];
  buyerContact?: {
    name: string;
    email: string;
    phone: string;
  };
  collectionCode?: string;
  requirements?: { item: string; description: string }[];
  venueSpaceId?: number;
  venueSpaceName?: string;
  damageDeposit?: number;
  cleaningFee?: number;
  dynamicFields?: Record<string, any>;
  delivery?: {
    offered: boolean;
    fee: number;
    method: 'PICKUP' | 'SELLER_DELIVERY';
  };
  pickupLocation?: string;
  pickupInstructions?: string;
}

export interface Product {
  id?: number;
  providerId: number;
  name: string;
  price: number;
  stock?: number;
  description: string;
  images: string[];
  category: string;
  createdAt: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Transaction {
  id?: number;
  userId: number;
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
  category: 'PAYMENT' | 'WITHDRAWAL' | 'DEPOSIT' | 'ESCROW_RELEASE';
  quoteId?: number;
  createdAt: number;
  status: 'PENDING' | 'COMPLETED' | 'ESCROW';
}

export interface Shop {
  id?: number;
  providerId: number;
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  registrationDate: number;
  registrationDocuments: string[];
  proofPhotos: string[];
  facebookLink?: string;
  tiktokLink?: string;
  whatsappLink?: string;
  isSaved?: boolean;
}

export interface CalendarEvent {
  id?: number;
  userId: number;
  title: string;
  note: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: 'WORK' | 'PERSONAL' | 'HEALTH' | 'OTHER';
  reminderEnabled: boolean;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  color?: string;
  createdAt: number;
}

export interface VenueSpace {
  id?: number;
  providerId: number;
  name: string;
  description: string;
  capacityStanding: number;
  capacitySeating: number;
  pricePerHour?: number;
  pricePerDay?: number;
  amenities: string[];
  images: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  createdAt: number;
}

export interface Schedule {
  id?: number;
  providerId: number;
  buyerId: number;
  inquiryId: number;
  quoteId: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: number;
  updatedAt: number;
}
