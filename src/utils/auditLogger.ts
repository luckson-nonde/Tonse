import { db } from '../services/api/database';
import { User } from '../AuthContext';
import { AuditLog } from '../types';

export async function logAuditAction(
  user: User,
  actionType: AuditLog['actionType'],
  targetId: string | number,
  targetTitle: string,
  buyerName: string,
  amount?: number,
  details?: string
) {
  if (!user.id) return;

  const providerId = user.role === 'PROVIDER_STAFF' ? user.parentProviderId : user.id;

  if (!providerId) return;

  const log: any = {
    providerId: typeof providerId === 'number' ? providerId : String(providerId),
    staffId: typeof user.id === 'number' ? user.id : String(user.id),
    staffName: user.name,
    actionType,
    action: actionType, // Backend field
    entityType: 'AUDIT', // Backend field
    entityId: typeof targetId === 'number' ? String(targetId) : targetId, // Backend field
    targetId,
    targetTitle,
    buyerName,
    amount,
    details,
    timestamp: Date.now(),
  };

  try {
    await db.auditLogs.add(log);
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
