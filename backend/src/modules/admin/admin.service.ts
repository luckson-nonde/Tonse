import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { InquiriesService } from '../inquiries/inquiries.service';
import { QuotesService } from '../quotes/quotes.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditService } from '../audit/audit.service';
import { CategoriesService } from '../categories/categories.service';
import { MilestonesService } from '../referrals/services/milestones.service';
import { PromotersService } from '../referrals/services/promoters.service';
import { CreateMilestoneDto } from '../referrals/dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../referrals/dto/update-milestone.dto';
import { ReportsService } from '../reports/reports.service';
import { ResolveReportDto } from '../reports/dto/resolve-report.dto';

/**
 * Acting-admin identity, threaded from req.user by the controller so
 * moderation actions land in audit_logs with WHO did them — matters now
 * that restricted User Manager sub-admins act alongside the primary
 * admin. displayId doubles as the human-readable log label (staffName).
 */
type ActingAdmin = { id: string; displayId?: string };

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly inquiriesService: InquiriesService,
    private readonly quotesService: QuotesService,
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
    private readonly categoriesService: CategoriesService,
    private readonly milestonesService: MilestonesService,
    private readonly promotersService: PromotersService,
    private readonly reportsService: ReportsService
  ) {}

  /**
   * Best-effort audit write for admin moderation actions — same
   * swallow-the-failure contract as setCategoryActive's logging: the
   * action itself must never fail because the log insert did.
   * audit_logs.staffId/staffName were built for "who performed the
   * action" and were never populated until now — they carry the acting
   * admin (primary or User Manager).
   */
  private auditAdminAction(entry: {
    action: string;
    entityType: string;
    entityId: string;
    targetUserId?: string;
    actingAdmin?: ActingAdmin;
    status?: string;
    reason?: string;
    details?: string;
  }) {
    return this.auditService
      .create({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.targetUserId,
        staffId: entry.actingAdmin?.id,
        staffName: entry.actingAdmin?.displayId ?? entry.actingAdmin?.id,
        status: entry.status,
        reason: entry.reason,
        details: entry.details,
      } as any)
      .catch((e: any) =>
        this.logger.warn(`Audit log failed for ${entry.action}: ${e?.message}`),
      );
  }

  // ───── Platform overview ────────────────────────────────────────────────

  async getStats() {
    // Pull a wide slice and aggregate in JS — simpler than custom SQL for now.
    // Bumped limits avoid undercounting a busy platform; revisit if perf bites.
    const [usersPage, inquiriesPage, quotesPage, paymentsPage] = await Promise.all([
      this.usersService.findAll({ limit: 10000 }),
      this.inquiriesService.findAll({ limit: 10000 }),
      this.quotesService.findAll({ limit: 10000 }),
      this.paymentsService.findAll({ limit: 10000 }),
    ]);

    const usersByRole: Record<string, number> = {};
    for (const u of usersPage.data) {
      const role = u.role || 'UNKNOWN';
      usersByRole[role] = (usersByRole[role] ?? 0) + 1;
    }

    const inquiriesByStatus: Record<string, number> = {};
    for (const i of inquiriesPage.data) {
      const s = (i as any).status || 'UNKNOWN';
      inquiriesByStatus[s] = (inquiriesByStatus[s] ?? 0) + 1;
    }

    const quotesByStatus: Record<string, number> = {};
    let quotesPaidVolume = 0;
    for (const q of quotesPage.data) {
      const s = (q as any).status || 'UNKNOWN';
      quotesByStatus[s] = (quotesByStatus[s] ?? 0) + 1;
      if (s === 'PAID' || s === 'COMPLETED' || s === 'HANDED_OVER') {
        quotesPaidVolume += Number((q as any).price ?? 0);
      }
    }

    const paymentsByStatus: Record<string, number> = {};
    let paymentsTotal = 0;
    for (const p of paymentsPage.data) {
      const s = (p as any).status || 'UNKNOWN';
      paymentsByStatus[s] = (paymentsByStatus[s] ?? 0) + 1;
      if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'PAID') {
        paymentsTotal += Number((p as any).amount ?? 0);
      }
    }

    // ── Overview enrichments ────────────────────────────────────────────
    // New signups in the trailing 7 days (from the user slice we already
    // pulled — no extra query).
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let recentSignups7d = 0;
    for (const u of usersPage.data) {
      const created = (u as any).createdAt ? new Date((u as any).createdAt).getTime() : 0;
      if (created >= sevenDaysAgo) recentSignups7d++;
    }

    // Inquiry → Quote → Paid funnel counts.
    const paidQuotes =
      (quotesByStatus['PAID'] ?? 0) +
      (quotesByStatus['COMPLETED'] ?? 0) +
      (quotesByStatus['HANDED_OVER'] ?? 0);

    // Pending verification queue size + category availability, in parallel.
    // Each is defended so a single failing sub-metric never 500s the whole
    // overview.
    const [pending, categoryCounts] = await Promise.all([
      this.listVerifications({ status: 'PENDING' }).catch(() => ({ data: [], total: 0 })),
      this.categoriesService.countsForOverview().catch(() => ({ total: 0, active: 0 })),
    ]);

    return {
      users: {
        total: usersPage.total,
        byRole: usersByRole,
        recentSignups7d,
      },
      inquiries: {
        total: inquiriesPage.total,
        byStatus: inquiriesByStatus,
      },
      quotes: {
        total: quotesPage.total,
        byStatus: quotesByStatus,
        paidVolumeZmw: quotesPaidVolume,
      },
      payments: {
        total: paymentsPage.total,
        byStatus: paymentsByStatus,
        totalCollectedZmw: paymentsTotal,
      },
      pendingVerifications: pending.total,
      funnel: {
        inquiries: inquiriesPage.total,
        quotes: quotesPage.total,
        paidQuotes,
      },
      categories: categoryCounts,
      generatedAt: new Date().toISOString(),
    };
  }

  // ───── User management ──────────────────────────────────────────────────

  async listUsers(filters: Record<string, any> = {}) {
    return this.usersService.findAll(filters);
  }

  async suspendUser(id: string, actingAdmin?: ActingAdmin) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.usersService.update(id, {
      isActive: false,
      verificationStatus: 'SUSPENDED',
    } as any);
    this.logger.log(`User ${id} suspended by ${actingAdmin?.id ?? '(unknown admin)'}.`);
    await this.auditAdminAction({
      action: 'USER_SUSPENDED',
      entityType: 'USER',
      entityId: id,
      targetUserId: id,
      actingAdmin,
      status: 'SUSPENDED',
    });
    return this.usersService.findById(id);
  }

  async unsuspendUser(id: string, actingAdmin?: ActingAdmin) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.usersService.update(id, {
      isActive: true,
      verificationStatus: 'VERIFIED',
    } as any);
    this.logger.log(`User ${id} reinstated by ${actingAdmin?.id ?? '(unknown admin)'}.`);
    await this.auditAdminAction({
      action: 'USER_UNSUSPENDED',
      entityType: 'USER',
      entityId: id,
      targetUserId: id,
      actingAdmin,
      status: 'ACTIVE',
    });
    return this.usersService.findById(id);
  }

  async deleteUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (user.role === 'ADMIN') {
      // Guardrail: never delete an admin via the API. Use the seed/manual DB.
      throw new NotFoundException('Admin accounts cannot be removed via the dashboard');
    }
    await this.usersService.remove(id);
    this.logger.log(`User ${id} deleted.`);
    return { id, deleted: true };
  }

  async getUserDetail(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  // ───── Verification queue ───────────────────────────────────────────────

  /**
   * Roles that go through admin verification. Only admins are excluded.
   * Buyers are verified too, but softly: an unapproved buyer keeps full
   * access (browse, inquire) and simply carries an "unverified" badge that
   * sellers/providers see on their inquiries.
   */
  static readonly VERIFIABLE_ROLES = [
    'BUYER',
    'SELLER',
    'SUPPLIER',
    'SERVICE_PROVIDER',
    'ENTERTAINMENT',
    'EVENTS',
    'LABOUR',
  ];

  /**
   * The subset of VERIFIABLE_ROLES that are real values in the tightened
   * `users_role_enum` (BUYER/SELLER/SERVICE_PROVIDER/ADMIN). SUPPLIER,
   * ENTERTAINMENT, EVENTS, and LABOUR became *categories*, not user roles —
   * querying `users.role = 'ENTERTAINMENT'` throws "invalid input value for
   * enum". Only these three are safe to filter the users table by.
   */
  static readonly QUERYABLE_VERIFIABLE_ROLES = ['BUYER', 'SELLER', 'SERVICE_PROVIDER'];

  async listVerifications(filters: Record<string, any> = {}) {
    // Default queue: all PENDING users in the verifiable role groups, newest
    // first. The admin can toggle by status (PENDING/VERIFIED/REJECTED) or
    // narrow to a single role.
    const status = filters.status || 'PENDING';
    const role = filters.role;
    // Guard against querying users by a role that isn't in the enum — any
    // requested role is intersected with the queryable set.
    const requestedRoles = (role ? [role] : AdminService.VERIFIABLE_ROLES).filter((r) =>
      AdminService.QUERYABLE_VERIFIABLE_ROLES.includes(r)
    );

    const all = await Promise.all(
      requestedRoles.map((r) =>
        this.usersService.findAll({
          role: r,
          verificationStatus: status,
          limit: 1000,
        })
      )
    );

    const merged = all.flatMap((p) => p.data ?? []);
    merged.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return tb - ta;
    });

    // Lightweight pagination on the merged set.
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const start = (page - 1) * limit;
    return {
      data: merged.slice(start, start + limit),
      total: merged.length,
    };
  }

  async verifyUser(id: string, actingAdmin?: ActingAdmin) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (!AdminService.VERIFIABLE_ROLES.includes(user.role)) {
      throw new NotFoundException(
        `Role '${user.role}' is not eligible for verification`
      );
    }
    // Phase 3: usersService.update() splits the payload — verificationStatus,
    // verifiedAt, verificationRejectionReason are profile fields and route to
    // the user's active profile row. isActive and isNrcVerified are auth
    // fields and stay on the users row.
    await this.usersService.update(id, {
      verificationStatus: 'VERIFIED',
      isActive: true,
      isNrcVerified: true,
      verifiedAt: new Date(),
      verificationRejectionReason: null,
    } as any);
    this.logger.log(`User ${id} verified by ${actingAdmin?.id ?? '(unknown admin)'}.`);
    await this.auditAdminAction({
      action: 'USER_VERIFIED',
      entityType: 'USER',
      entityId: id,
      targetUserId: id,
      actingAdmin,
      status: 'VERIFIED',
    });
    const fresh = await this.usersService.findById(id);
    return this.usersService.flattenWithProfile(fresh);
  }

  async rejectUser(id: string, reason?: string, actingAdmin?: ActingAdmin) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (!AdminService.VERIFIABLE_ROLES.includes(user.role)) {
      throw new NotFoundException(
        `Role '${user.role}' is not eligible for verification`
      );
    }
    await this.usersService.update(id, {
      verificationStatus: 'REJECTED',
      verificationRejectionReason: reason || 'No reason provided',
      rejectedAt: new Date(),
      verifiedAt: null,
    } as any);
    this.logger.log(`User ${id} verification rejected: ${reason ?? '(no reason)'}`);
    await this.auditAdminAction({
      action: 'USER_REJECTED',
      entityType: 'USER',
      entityId: id,
      targetUserId: id,
      actingAdmin,
      status: 'REJECTED',
      reason: reason || 'No reason provided',
    });
    const fresh = await this.usersService.findById(id);
    return this.usersService.flattenWithProfile(fresh);
  }

  // ───── User reports (complaints) ─────────────────────────────────────────

  async listReports(filters: Record<string, any> = {}) {
    return this.reportsService.findAll(filters);
  }

  async resolveReport(id: string, dto: ResolveReportDto, actingAdmin?: ActingAdmin) {
    const report = await this.reportsService.resolve(
      id,
      actingAdmin?.id ?? null,
      dto,
    );
    await this.auditAdminAction({
      action: dto.status === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      entityType: 'REPORT',
      entityId: report.id,
      targetUserId: report.reportedUserId,
      actingAdmin,
      status: dto.status,
      details: dto.resolutionNote || undefined,
    });
    return report;
  }

  // ───── Category control ─────────────────────────────────────────────────

  async listCategories() {
    return this.categoriesService.listForAdmin();
  }

  async setCategoryActive(id: string, isActive: boolean) {
    const category = await this.categoriesService.setActive(id, isActive);
    // Best-effort audit trail — category ids are slugs (not UUIDs), so the
    // slug lands in details/targetTitle rather than the UUID-typed entityId.
    await this.auditService
      .create({
        action: isActive ? 'CATEGORY_ENABLED' : 'CATEGORY_DISABLED',
        entityType: 'CATEGORY',
        targetTitle: category.name,
        details: `Category '${id}' ${isActive ? 'enabled' : 'disabled'} platform-wide`,
        status: isActive ? 'ACTIVE' : 'DISABLED',
      })
      .catch((e) =>
        this.logger.warn(`Audit log for category toggle failed: ${e?.message ?? e}`)
      );
    return category;
  }

  // ───── Promoter programme (milestones + oversight) ──────────────────────
  // Same composition pattern as category control above: the feature logic
  // lives in ReferralsModule; AdminService just fronts it behind the
  // class-wide ADMIN guard. MilestonesService itself handles the retro-award
  // sweep + MILESTONE_UPDATED broadcast after every mutation.

  async listMilestones() {
    return this.milestonesService.list();
  }

  async createMilestone(dto: CreateMilestoneDto) {
    return this.milestonesService.create(dto);
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDto) {
    return this.milestonesService.update(id, dto);
  }

  async removeMilestone(id: string) {
    return this.milestonesService.remove(id);
  }

  async listPromoters() {
    return this.promotersService.listForAdmin();
  }

  async getPromoterDetail(id: string) {
    return this.promotersService.getAdminDetail(id);
  }

  async setPromoterVerification(id: string, status: 'VERIFIED' | 'REJECTED', reason?: string) {
    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      throw new NotFoundException('status must be VERIFIED or REJECTED');
    }
    return this.promotersService.setVerification(id, status, reason);
  }

  async getPromoterInvite() {
    return this.promotersService.getInviteSettings();
  }

  async rotatePromoterInvite() {
    return this.promotersService.rotateInviteKey();
  }

  // ───── Cross-cutting list endpoints ─────────────────────────────────────

  async listInquiries(filters: Record<string, any> = {}) {
    return this.inquiriesService.findAll(filters);
  }

  async listQuotes(filters: Record<string, any> = {}) {
    return this.quotesService.findAll(filters);
  }

  async listTransactions(filters: Record<string, any> = {}) {
    return this.paymentsService.findAll(filters);
  }

  async listAudit(filters: Record<string, any> = {}) {
    return this.auditService.findAll(filters);
  }

  // ───── Destructive maintenance ──────────────────────────────────────────

  async clearAllData(): Promise<void> {
    this.logger.log('Starting Factory Reset: Clearing all transactional data...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tables = [
        'audit_logs',
        'payments',
        'orders',
        'quotes',
        'inquiries',
        'schedules',
        'products',
        'shops',
      ];

      for (const table of tables) {
        this.logger.debug(`Truncating table: ${table}`);
        await queryRunner.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }

      await queryRunner.commitTransaction();
      this.logger.log('Factory Reset successful. All transactional data cleared.');
    } catch (error) {
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
      this.logger.error('Factory Reset failed!', errorDetails);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
