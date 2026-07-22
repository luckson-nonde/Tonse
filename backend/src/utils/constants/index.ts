// Application constants
export const APP_NAME = 'ProQuote Zambia Marketplace';
export const APP_VERSION = '1.0.0';
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

// Roles
export const ROLES = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  SUPPLIER: 'SUPPLIER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  ENTERTAINMENT: 'ENTERTAINMENT',
  EVENTS: 'EVENTS',
};

// Statuses
export const STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
};

// Inquiry statuses
export const INQUIRY_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
};

// Quote statuses
export const QUOTE_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  COMPLETED: 'COMPLETED',
};

// Order statuses
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// Payment types
export const PAYMENT_TYPE = {
  DEPOSIT: 'DEPOSIT',
  PAYMENT: 'PAYMENT',
  WITHDRAWAL: 'WITHDRAWAL',
  REFUND: 'REFUND',
  TRANSFER: 'TRANSFER',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};
