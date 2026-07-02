import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityAudit } from './entities/identity-audit.entity';

/**
 * Identity Audit Service
 *
 * Owns the `identity_audits` table: the audit trail for identity-related
 * changes (registration, email changes, NRC verification, password changes,
 * suspension, suspicious-activity flags).
 *
 * Extracted from UsersService so identity/profile management and audit
 * logging are separate concerns. Distinct from the generic AuditModule
 * (`audit_logs` table) — this log is identity-specific and relates to User
 * with an FK + CASCADE.
 */
@Injectable()
export class IdentityAuditService {
  private readonly logger = new Logger(IdentityAuditService.name);

  constructor(
    @InjectRepository(IdentityAudit)
    private readonly identityAuditRepository: Repository<IdentityAudit>,
  ) {}

  /**
   * Create an audit log entry
   *
   * @param userId - User ID
   * @param eventType - Type of event
   * @param description - Human-readable description
   * @param previousValue - Previous value (for changes)
   * @param newValue - New value (for changes)
   * @param changedField - Which field changed
   * @param ipAddress - Source IP address
   * @param userAgent - User agent
   * @param adminId - Admin ID if admin action
   * @param metadata - Additional metadata
   */
  async createAuditLog(
    userId: string,
    eventType: string,
    description: string,
    previousValue?: any,
    newValue?: any,
    changedField?: string,
    ipAddress?: string,
    userAgent?: string,
    adminId?: string,
    metadata?: Record<string, any>
  ): Promise<IdentityAudit> {
    const audit = this.identityAuditRepository.create({
      userId,
      eventType,
      description,
      previousValue,
      newValue,
      changedField,
      ipAddress,
      userAgent,
      adminId,
      metadata,
      verificationStatus: 'UNVERIFIED',
    });

    return this.identityAuditRepository.save(audit);
  }

  /**
   * Get audit logs for a user
   *
   * @param userId - User ID
   * @param limit - Number of records to return
   * @param skip - Number of records to skip
   * @returns Array of audit logs
   */
  async getAuditLogs(
    userId: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<IdentityAudit[]> {
    return this.identityAuditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
  }

  /**
   * Flag suspicious activity
   *
   * @param userId - User ID
   * @param reason - Reason for flag
   * @param metadata - Additional context
   * @param ipAddress - IP address
   * @param userAgent - User agent
   */
  async flagSuspiciousActivity(
    userId: string,
    reason: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IdentityAudit> {
    return this.createAuditLog(
      userId,
      'SUSPICIOUS_ACTIVITY',
      reason,
      null,
      null,
      null,
      ipAddress,
      userAgent,
      null,
      metadata || { flagReason: reason }
    ).then(async (audit) => {
      audit.isSuspicious = true;
      return this.identityAuditRepository.save(audit);
    });
  }
}
