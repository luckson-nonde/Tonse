import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Reads `@RequirePermissions(...)` metadata and enforces it against
 * `request.user.permissions`. Semantics mirror the frontend `hasPermission`:
 *   - no metadata          → allow (open to any authenticated user)
 *   - owner (no parent)    → allow (top-level accounts have full access)
 *   - staff (has parent)   → allow only if they hold ALL required permissions
 *
 * Requires that `JwtStrategy.validate()` puts `parentProviderId` and
 * `permissions` on `request.user` (it does). Use together with JwtAuthGuard.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // Owners (top-level accounts) bypass permission checks.
    if (!user.parentProviderId) {
      return true;
    }

    const held: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    const ok = required.every((p) => held.includes(p));
    if (!ok) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(', ')}`,
      );
    }
    return true;
  }
}
