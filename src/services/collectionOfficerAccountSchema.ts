import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';

/**
 * Dedicated, minimal dashboard for a Collection Officer (collection-only
 * staff). Only the handover surface (+ their own profile) — no home, leads,
 * quotes, products, financial, team, etc. Because this is a purpose-built
 * schema rather than the seller schema with items hidden, the known leaks
 * (the ungated `financial` nav item, the `home` fallback) simply don't exist
 * for this user.
 *
 * Resolved by `pickSchemasForUser` when `isCollectionOfficer(user)` is true.
 */
export const MASTER_COLLECTION_OFFICER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    {
      id: 'collection',
      label: 'Collection',
      icon: 'QrCode',
      permissions: [PERMISSIONS.MANAGE_COLLECTIONS],
    },
    { id: 'profile', label: 'Profile', icon: 'User' },
  ],
  views: {
    collection: {
      title: 'Parcel Collection',
      subtitle: 'Scan, verify and complete order collections',
      componentType: 'provider_collection',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your contact details',
      componentType: 'profile_renderer',
    },
  },
};
