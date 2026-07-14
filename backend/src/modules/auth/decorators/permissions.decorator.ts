import { SetMetadata } from '@nestjs/common';

/**
 * Attach one or more required permission codes to a route handler / controller.
 * `PermissionsGuard` reads this metadata and 403s any staff user whose
 * `request.user.permissions` doesn't include all of them. Owners (no
 * `parentProviderId`) bypass the check. No metadata = no permission check.
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
