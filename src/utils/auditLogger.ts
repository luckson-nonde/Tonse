import { db } from '../services/api/database';
import { User } from '../AuthContext';

export async function logAuditAction(
  user: User,
  action: string,
  entityId: string | number,
  targetTitle: string,
  buyerName: string,
  amount?: number,
  details?: string
) {
  if (!user.id) return;

  // Phase 2: PROVIDER_STAFF dropped from the role enum. Resolve the parent
  // provider purely by presence of parentProviderId — staff (if reintroduced
  // later as a SELLER subRole) just sets that field.
  const providerId = user.parentProviderId ?? user.id;

  if (!providerId) return;

  // Strictly typed audit log - only include fields that match DTO
  const auditLogData = {
    providerId: typeof providerId === 'number' ? String(providerId) : providerId,
    staffId: typeof user.id === 'number' ? String(user.id) : user.id,
    staffName: user.name || '',
    action, // This matches 'action' field in DTO
    entityType: 'QUOTE',
    entityId: typeof entityId === 'number' ? String(entityId) : entityId,
    targetTitle: targetTitle || '',
    buyerName: buyerName || '',
    ...(amount !== undefined && { amount }),
    ...(details && { details }),
  };

  try {
    console.log('Sending audit log:', auditLogData);
    await db.auditLogs.add(auditLogData);
  } catch (error) {
    console.error('Failed to log audit action:', error);
    // Don't throw - just log the error
  }
}
