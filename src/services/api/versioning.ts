/**
 * API Version Configuration (v1 only)
 * Single version for development
 */

export const CURRENT_API_VERSION = 'v1';
export const DEFAULT_API_VERSION = 'v1';

export interface ApiVersionConfig {
  version: string;
  releaseDate: string;
  description: string;
  features: string[];
}

export const API_VERSIONS: Record<string, ApiVersionConfig> = {
  v1: {
    version: 'v1',
    releaseDate: '2025-01-01',
    description: 'API version 1 - Marketplace API',
    features: [
      'User authentication with JWT',
      'Inquiry management',
      'Quote creation and tracking',
      'Order management',
      'Payment processing',
      'Delivery tracking',
      'Audit logs',
    ],
  },
};

export const getVersionInfo = (version: string): ApiVersionConfig | null => {
  return API_VERSIONS[version] || null;
};

export const getAvailableVersions = (): string[] => {
  return Object.keys(API_VERSIONS);
};
