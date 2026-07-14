import { SetMetadata } from '@nestjs/common';

export const ADMIN_PERMISSION_KEY = 'adminPermission';

/**
 * Opens an admin route to sub-admins holding ANY of the listed permission
 * codes (OR semantics). Routes WITHOUT this decorator stay primary-admin
 * only — AdminPermissionsGuard denies sub-admins by default, so new admin
 * routes are safe unless explicitly opened up.
 */
export const AdminPermission = (...codes: string[]) =>
  SetMetadata(ADMIN_PERMISSION_KEY, codes);
