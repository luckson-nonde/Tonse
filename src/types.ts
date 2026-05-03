export interface HeroContent {
  title: string;
  image: string;
  bullets: string[];
}

export interface User {
  // System Identifiers (Three-Tier Identity System)
  id: string; // System UUID for internal operations
  displayId?: string; // User-facing ID (USER-XXXXXX format)
  nrcNumber?: string; // National Registration Card (real-world anchor)

  // Contact Information
  email: string; // Primary email
  primaryEmail?: string; // Primary email (alternative field name)
  phone?: string; // Primary phone number
  emails?: UserEmail[]; // Multiple emails for same account

  // User Profile
  role: string; // User role (BUYER, SELLER, etc.)
  name?: string; // Full name
  profilePicture?: string; // Profile picture URL or base64
  location?: string; // Location
  balance?: number; // Virtual account balance

  // Business Information (optional)
  companyName?: string;
  businessLicenseId?: string;
  categories?: string[];

  // Account Status
  isActive?: boolean; // Account active status
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  isNrcVerified?: boolean; // NRC verification status

  // Legacy/Additional Fields
  virtualAccountNumber?: string;
  parentProviderId?: string;
  [key: string]: any; // Allow additional properties
}

export interface UserEmail {
  id: string;
  userId: string;
  email: string;
  isPrimary: boolean;
  verificationStatus: 'NOT_VERIFIED' | 'VERIFICATION_SENT' | 'VERIFIED';
  isRecoveryEmail?: boolean;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IdentityAudit {
  id: string;
  userId: string;
  eventType: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  changedField?: string;
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;
  isSuspicious?: boolean;
  verificationStatus?: 'UNVERIFIED' | 'VERIFIED' | 'FRAUD';
  createdAt: string;
}

export type SubRole =
  // Buyer shapes
  | 'INDIVIDUAL_BUYER'
  | 'COMPANY_BUYER'
  | 'COMPANY_PROCUREMENT_OFFICER'
  | 'COMPANY_SECRETARY'
  | 'COMPANY_RECEPTIONIST'
  | 'COMPANY_MANAGER'
  // Seller (goods) shapes — HYBRID_SELLER, SUPPLIER_SELLER and the legacy
  // SERVICE_SELLER were retired in Phase 1.5: wholesale / multi-archetype
  // / service-only sellers are now expressed via the `archetypes` set on
  // the active profile, not via the auth-level subRole.
  | 'PRODUCT_SELLER'
  // Service-provider shapes (services are not sellers)
  | 'INDIVIDUAL_PROVIDER'
  | 'AGENCY_PROVIDER'
  | 'SKILLED_LABOUR';
export type EntityType = 'INDIVIDUAL' | 'BUSINESS';

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
  displayId?: string; // Human-friendly display ID (QID-XXXXXX format)
  title: string;
  description: string;
  items: InquiryItem[];
  category: string;
  location: string;
  buyerName: string;
  buyerId: number;
  createdAt: number;
  status: 'OPEN' | 'QUOTED' | 'CLOSED';
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
  processType?: 'EXPRESS' | 'STANDARD';
  currentStage?:
    | 'quotation'
    | 'purchase_order'
    | 'order_confirmation'
    | 'delivery_order'
    | 'completed';
  archivedBy?: string[];
  deletedBy?: string[];
  // Legacy fields for backward compatibility
  entertainmentData?: any;
  repairData?: any;
  // Labour fields
  isLabour?: boolean;
  labourGroup?: string;
  labourSubType?: string;
  targetedProviderId?: string; // ID of the specific provider if it's a direct inquiry
}

export interface Quote {
  id?: string | number;
  inquiryId: string | number;
  inquiryTitle: string;
  providerId: string | number;
  providerName: string;
  price: number;
  condition: string;
  message: string;
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'ARCHIVED'
    | 'PAID'
    | 'PENDING_COLLECTION'
    | 'AWAITING_PICKUP'
    | 'COMPLETED'
    | 'HANDED_OVER'
    | 'SUPERSEDED';
  quoteType?: 'ORIGINAL' | 'REVISION';
  parentQuoteId?: string | number;
  createdAt: number | string | Date;
  expiryDuration?: string;
  isRead?: boolean;
  isArchived?: boolean;
  itemPrices?: any;
  buyerContact?: {
    name: string;
    email: string;
    phone: string;
  };
  collectionCode?: string;
  requirements?: any;
  venueSpaceId?: number | string;
  venueSpaceName?: string;
  damageDeposit?: number;
  cleaningFee?: number;
  securityDeposit?: number;
  maxCapacity?: number;
  numberOfWorkers?: number;
  availabilityDate?: string | Date;
  rateUnit?: string;
  dynamicFields?: any;
  processType?: 'EXPRESS' | 'STANDARD';
  delivery?: any;
  pickupLocation?: string;
  pickupInstructions?: string;
}

export interface Product {
  id?: number;
  providerId: string | number;
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
  subRole?: SubRole;
  entityType?: EntityType;
  logo: string;
  coverImage: string;
  description: string;
  category: string;
  categories?: string[];
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

export interface AuditLog {
  id?: number | string;
  providerId?: string | number;
  staffId?: string | number;
  staffName?: string;
  action?: string;
  entityType?: string;
  entityId?: string | number;
  targetTitle?: string;
  buyerName?: string;
  amount?: number;
  details?: string;
  // For responses from backend:
  actionType?: 'QUOTE_SENT' | 'COLLECTION_STARTED' | 'HANDOVER_COMPLETED' | string;
  targetId?: number | string;
  timestamp?: number;
  createdAt?: string | Date;
}

export interface PurchaseOrder {
  id?: number;
  inquiryId: number;
  quotationId: number;
  buyerId: number;
  providerId: number;
  lineItems: {
    itemId: string;
    name: string;
    quotedPrice: number;
    quantity: number;
    minQuantity?: number;
    maxQuantity?: number;
  }[];
  removedItems: string[];
  paymentMethod: 'pay_now' | 'pay_later';
  paymentDueDate?: string;
  status: 'pending_seller_action' | 'accepted' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrderConfirmation {
  id?: number;
  poId: number;
  inquiryId: number;
  quoteId: number;
  buyerId: number;
  providerId: number;
  items: InquiryItem[];
  notes?: string;
  processingTime?: string;
  expectedDeliveryDate?: string;
  paymentStatus: 'PAID' | 'SCHEDULED';
  confirmationReference: string;
  createdAt: number;
}

export interface DeliveryOrder {
  id?: number;
  inquiryId: number;
  quotationId: number;
  purchaseOrderId: number;
  orderConfirmationId: number;
  buyerId: number;
  sellerId: number;
  qrCode: string;
  status: 'pending_pickup' | 'collection_started' | 'collected' | 'completed';
  sellerNotes?: string;
  collectionTimestamp?: string;
  createdAt: string;
  updatedAt: string;
}
