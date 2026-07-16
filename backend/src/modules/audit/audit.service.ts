import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { getAuditContext } from '../../common/audit/audit-context';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    // Auto-attribute the WHO + WHERE from the ambient request context so every
    // write records the actor, IP and user-agent without the call-site having
    // to pass them. Explicit values on the DTO always win (e.g. a system job).
    const ctx = getAuditContext();
    const entry: Record<string, any> = { ...createAuditLogDto };
    if (ctx) {
      if (entry.userId == null && ctx.userId) entry.userId = ctx.userId;
      if (entry.actorLabel == null && ctx.actorLabel) entry.actorLabel = ctx.actorLabel;
      if (entry.ipAddress == null && ctx.ipAddress) entry.ipAddress = ctx.ipAddress;
      if (entry.userAgent == null && ctx.userAgent) entry.userAgent = ctx.userAgent;
    }
    const auditLog = this.auditRepository.create(entry as Partial<AuditLog>);
    return this.auditRepository.save(auditLog);
  }

  async findAll(filters: any = {}): Promise<{ data: AuditLog[]; total: number }> {
    const queryBuilder = this.auditRepository.createQueryBuilder('auditLog');

    if (filters.userId) {
      queryBuilder.andWhere('auditLog.userId = :userId', { userId: filters.userId });
    }

    if (filters.providerId) {
      queryBuilder.andWhere('auditLog.providerId = :providerId', { providerId: filters.providerId });
    }

    if (filters.staffId) {
      queryBuilder.andWhere('auditLog.staffId = :staffId', { staffId: filters.staffId });
    }

    if (filters.staffName) {
      queryBuilder.andWhere('auditLog.staffName LIKE :staffName', {
        staffName: `%${filters.staffName}%`,
      });
    }

    if (filters.action) {
      queryBuilder.andWhere('auditLog.action = :action', { action: filters.action });
    }

    if (filters.entityType) {
      queryBuilder.andWhere('auditLog.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters.entityId) {
      queryBuilder.andWhere('auditLog.entityId = :entityId', { entityId: filters.entityId });
    }

    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere(
        'auditLog.createdAt >= :dateFrom AND auditLog.createdAt <= :dateTo',
        {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
      );
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 30;
    queryBuilder.skip((page - 1) * limit).take(limit);

    queryBuilder.orderBy('auditLog.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<AuditLog> {
    return this.auditRepository.findOne({
      where: { id },
    });
  }

  // providerId scopes every read to the caller's shop (passed by the
  // controller from the JWT) so one lender can't read another's trail.
  async findByUser(userId: string, limit: number = 50, providerId?: string): Promise<AuditLog[]> {
    const where: any = { userId };
    if (providerId) where.providerId = providerId;
    return this.auditRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByEntity(entityType: string, entityId: string, providerId?: string): Promise<AuditLog[]> {
    const where: any = { entityType, entityId };
    if (providerId) where.providerId = providerId;
    return this.auditRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findByAction(action: string, limit: number = 50, providerId?: string): Promise<AuditLog[]> {
    const where: any = { action };
    if (providerId) where.providerId = providerId;
    return this.auditRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
