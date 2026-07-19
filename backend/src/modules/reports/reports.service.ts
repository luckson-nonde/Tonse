import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserReport } from './entities/user-report.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(UserReport)
    private readonly reportRepository: Repository<UserReport>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto): Promise<UserReport> {
    if (dto.reportedUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }
    const target = await this.usersService.findById(dto.reportedUserId);
    if (!target) {
      throw new NotFoundException('Reported user not found');
    }
    // One OPEN report per (reporter, target) pair PER CONTEXT — a resubmit
    // for the same transaction while the first is still unreviewed is a
    // double-click or spam, not new signal; a different transaction with the
    // same counterparty is genuinely new signal. No-context reports (shop
    // profile) keep the old one-per-pair rule via the IS NULL match.
    const existingOpen = await this.reportRepository.findOne({
      where: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        status: 'OPEN',
        contextId: dto.contextId ?? IsNull(),
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

    // Best-effort: the report row is the source of truth; a notification
    // hiccup must never fail the filing itself.
    try {
      await this.dispatchReportNotifications(saved, reporterId);
    } catch (e: any) {
      this.logger.warn(`report.create: notification dispatch failed: ${e?.message}`);
    }

    return saved;
  }

  /**
   * Reporter gets a confirmation (routed to their Report Manager tab);
   * the primary admin + every active User Manager holding ADMIN_REPORTS
   * gets the new-report alert (routed to the admin console).
   */
  private async dispatchReportNotifications(
    report: UserReport,
    reporterId: string,
  ): Promise<void> {
    const identity = await this.usersService.resolveDisplayIdentities([
      reporterId,
      report.reportedUserId,
    ]);
    const reporter = identity.get(reporterId);
    const reported = identity.get(report.reportedUserId);
    const reporterRoute =
      reporter?.role === 'BUYER' ? '/buyer/reporting' : '/provider/reporting';

    await this.notificationsService.notifyUsers([reporterId], 'REPORT_FILED', () => ({
      title: `Report submitted against ${reported?.name ?? 'the other party'} — our team will review it.`,
      data: { reportId: report.id, category: report.category },
      route: reporterRoute,
    }));

    const adminIds = await this.usersService.findReportAdminRecipients();
    await this.notificationsService.notifyUsers(adminIds, 'REPORT_RECEIVED', () => ({
      title: `New report: ${reporter?.name ?? 'A user'} reported ${reported?.name ?? 'a user'}`,
      data: {
        reportId: report.id,
        category: report.category,
        ...(report.contextType ? { contextType: report.contextType } : {}),
      },
      route: '/admin',
    }));
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
    const identity = await this.usersService.resolveDisplayIdentities(userIds);
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

}
