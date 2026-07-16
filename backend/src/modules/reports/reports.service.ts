import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReport } from './entities/user-report.entity';
import { UsersService } from '../users/users.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(UserReport)
    private readonly reportRepository: Repository<UserReport>,
    private readonly usersService: UsersService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto): Promise<UserReport> {
    if (dto.reportedUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }
    const target = await this.usersService.findById(dto.reportedUserId);
    if (!target) {
      throw new NotFoundException('Reported user not found');
    }
    // One OPEN report per (reporter, target) pair — a resubmit while the
    // first is still unreviewed is a double-click or spam, not new signal.
    const existingOpen = await this.reportRepository.findOne({
      where: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        status: 'OPEN',
      },
    });
    if (existingOpen) {
      throw new ConflictException(
        'You already have an open report against this user — an admin will review it.',
      );
    }

    const report = this.reportRepository.create({
      reporterId,
      reportedUserId: dto.reportedUserId,
      category: dto.category,
      description: dto.description,
      contextType: dto.contextType ?? null,
      contextId: dto.contextId ?? null,
      status: 'OPEN',
    });
    const saved = await this.reportRepository.save(report);
    this.logger.log(
      `report.create: ${reporterId} reported ${dto.reportedUserId} (${dto.category}) → ${saved.id}`,
    );
    return saved;
  }

  /**
   * Admin queue. Rows are hydrated with human identity for both parties
   * (name from whichever profile table holds it, displayId from users) —
   * without this the admin table is a wall of uuids.
   */
  async findAll(
    filters: Record<string, any> = {},
  ): Promise<{ data: any[]; total: number }> {
    const qb = this.reportRepository.createQueryBuilder('report');
    if (filters.status) {
      qb.andWhere('report.status = :status', { status: filters.status });
    }
    if (filters.reportedUserId) {
      qb.andWhere('report.reportedUserId = :reportedUserId', {
        reportedUserId: filters.reportedUserId,
      });
    }
    if (filters.reporterId) {
      qb.andWhere('report.reporterId = :reporterId', {
        reporterId: filters.reporterId,
      });
    }
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    qb.orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [rows, total] = await qb.getManyAndCount();

    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.reporterId, r.reportedUserId]).filter(Boolean)),
    );
    const identity = await this.resolveIdentities(userIds);
    const data = rows.map((r) => ({
      ...r,
      reporterName: identity.get(r.reporterId)?.name ?? null,
      reporterDisplayId: identity.get(r.reporterId)?.displayId ?? null,
      reporterRole: identity.get(r.reporterId)?.role ?? null,
      reportedUserName: identity.get(r.reportedUserId)?.name ?? null,
      reportedUserDisplayId: identity.get(r.reportedUserId)?.displayId ?? null,
      reportedUserRole: identity.get(r.reportedUserId)?.role ?? null,
    }));
    return { data, total };
  }

  async resolve(
    id: string,
    adminId: string | null,
    dto: ResolveReportDto,
  ): Promise<UserReport> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    report.status = dto.status;
    report.resolutionNote = dto.resolutionNote ?? null;
    report.resolvedByAdminId = adminId;
    report.resolvedAt = new Date();
    const saved = await this.reportRepository.save(report);
    this.logger.log(`report.resolve: ${id} → ${dto.status} by admin ${adminId}`);
    return saved;
  }

  /**
   * Batched identity lookup: displayId + role from users, name from
   * whichever profile table the user's role puts it on (admins keep name
   * on users.name — the ADMIN carve-out).
   */
  private async resolveIdentities(
    userIds: string[],
  ): Promise<Map<string, { name: string | null; displayId: string | null; role: string | null }>> {
    const map = new Map<
      string,
      { name: string | null; displayId: string | null; role: string | null }
    >();
    if (userIds.length === 0) return map;

    const userRows: Array<{
      id: string;
      displayId: string | null;
      role: string;
      name: string | null;
    }> = await this.reportRepository.query(
      `SELECT id, "displayId", role, name FROM users WHERE id = ANY($1::uuid[])`,
      [userIds],
    );
    for (const u of userRows) {
      map.set(u.id, { name: u.name ?? null, displayId: u.displayId, role: u.role });
    }

    const profileRows: Array<{ userId: string; name: string | null }> =
      await this.reportRepository.query(
        `SELECT "userId", name FROM buyer_profiles WHERE "userId" = ANY($1::uuid[])
         UNION ALL
         SELECT "userId", name FROM seller_profiles WHERE "userId" = ANY($1::uuid[])
         UNION ALL
         SELECT "userId", name FROM service_provider_profiles WHERE "userId" = ANY($1::uuid[])`,
        [userIds],
      );
    for (const p of profileRows) {
      const entry = map.get(p.userId);
      if (entry && !entry.name && p.name) entry.name = p.name;
    }
    return map;
  }
}
