import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext, AuditActorContext } from './audit-context';

/**
 * Establishes the ambient {@link auditContext} for the lifetime of each HTTP
 * request. Runs as an interceptor (AFTER guards), so `req.user` — set by the
 * JWT guard — is already available. The downstream handler is subscribed INSIDE
 * `auditContext.run(...)` so every async continuation (service calls, audit
 * writes) inherits the actor + network metadata. Fail-open: unauthenticated or
 * non-HTTP requests just run without a store.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const req: any = context.switchToHttp().getRequest();
    const user = req?.user;

    const fwd = req?.headers?.['x-forwarded-for'];
    const ipRaw = Array.isArray(fwd)
      ? fwd[0]
      : typeof fwd === 'string'
        ? fwd.split(',')[0]
        : '';
    const ipAddress =
      (ipRaw && ipRaw.trim()) || req?.ip || req?.socket?.remoteAddress || undefined;

    const store: AuditActorContext = {
      userId: user?.id,
      actorLabel: user
        ? `${user.displayId || user.email || user.id}${user.role ? ` (${user.role})` : ''}`
        : undefined,
      ipAddress: ipAddress || undefined,
      userAgent: req?.headers?.['user-agent'] || undefined,
    };

    return new Observable((subscriber) => {
      let sub: { unsubscribe(): void } | undefined;
      auditContext.run(store, () => {
        sub = next.handle().subscribe(subscriber);
      });
      return () => sub?.unsubscribe();
    });
  }
}
