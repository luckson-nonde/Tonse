import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditRepository.create(createAuditLogDto);
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

  async findByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByAction(action: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { action },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
