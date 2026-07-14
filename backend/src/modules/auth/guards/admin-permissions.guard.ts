import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_PERMISSION_KEY } from '../decorators/admin-permission.decorator';

/**
 * Fine-grained gate for the admin console, layered after JwtAuthGuard +
 * RolesGuard on AdminController.
 *
 *   - Primary admin (role ADMIN, parentProviderId NULL): full access to
 *     every route, no decoration needed.
 *   - Sub-admin ("User Manager": role ADMIN, parentProviderId set): only
 *     passes routes decorated with @AdminPermission(...) naming a code in
 *     their `permissions` column. Undecorated routes are DENIED —
 *     deny-by-default means new admin routes never leak to sub-admins.
 *
 * Reads parentProviderId/permissions off req.user, which JwtStrategy
 * loads from the DB on every request — permission edits apply instantly.
 */
@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    if (!user.parentProviderId) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      ADMIN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      throw new ForbiddenException(
        'This action requires the primary admin account',
      );
    }
    const granted: string[] = user.permissions ?? [];
    if (!required.some((code) => granted.includes(code))) {
      throw new ForbiddenException(
        `Missing admin permission (requires one of: ${required.join(', ')})`,
      );
    }
    return true;
  }
}
