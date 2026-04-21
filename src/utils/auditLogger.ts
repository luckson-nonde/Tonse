import { db } from '../services/api/database';
import { User } from '../AuthContext';
import { AuditLog } from '../types';

export async function logAuditAction(
  user: User,
  actionType: AuditLog['actionType'],
  targetId: number,
  targetTitle: string,
  buyerName: string,
  amount?: number,
  details?: string
) {
  if (!user.id) return;

  const providerId = user.role === 'PROVIDER_STAFF' ? user.parentProviderId : user.id;

  if (!providerId) return;

  const log: AuditLog = {
    providerId: typeof providerId === 'number' ? providerId : parseInt(String(providerId), 10),
    staffId: typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10),
    staffName: user.name,
    actionType,
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
