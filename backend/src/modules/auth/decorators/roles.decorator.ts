import { SetMetadata } from '@nestjs/common';

/**
 * Attach one or more roles to a route handler / controller.
 * `RolesGuard` reads this metadata and 403s anyone whose `request.user.role`
 * isn't in the list. No metadata = no role check.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
