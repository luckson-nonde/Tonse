import { AsyncLocalStorage } from 'async_hooks';

/**
 * Ambient per-request AUDIT context. Populated once per HTTP request (after the
 * auth guard resolves `req.user`) by {@link AuditContextInterceptor}, and read
 * by AuditService.create so EVERY audit write automatically records WHO did it
 * and from WHERE — without threading the request through every service layer.
 */
export interface AuditActorContext {
  /** The acting user's id (the human behind the action). */
  userId?: string;
  /** Human-readable actor, e.g. "USER-KVBDUK (SERVICE_PROVIDER)". Denormalised
   *  so the trail survives the actor's later deletion. */
  actorLabel?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const auditContext = new AsyncLocalStorage<AuditActorContext>();

/** Current request's audit actor context, if any. */
export function getAuditContext(): AuditActorContext | undefined {
  return auditContext.getStore();
}
