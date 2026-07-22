// Frontend lib/constants exports
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
export const APP_NAME = 'ProQuote Zambia Marketplace';
export const TOKEN_STORAGE_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_STORAGE_KEY = 'user';

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
export const INQUIRY_STATUSES = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
};

export const QUOTE_STATUSES = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  COMPLETED: 'COMPLETED',
};

export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
