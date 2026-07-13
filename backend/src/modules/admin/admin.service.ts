import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { InquiriesService } from '../inquiries/inquiries.service';
import { QuotesService } from '../quotes/quotes.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditService } from '../audit/audit.service';
import { CategoriesService } from '../categories/categories.service';

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
    private readonly categoriesService: CategoriesService
  ) {}

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
    const page = await this.usersService.findAll(filters);
    // Phase 3: name / email / business identity live on the profile row, not
    // the users (auth) row. Flatten each so the admin Users table isn't a
    // list of anonymous display IDs.
    const data = await Promise.all(
      page.data.map((u) => this.usersService.flattenWithProfile(u))
    );
    return { ...page, data };
  }

  async suspendUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.usersService.update(id, {
      isActive: false,
      verificationStatus: 'SUSPENDED',
    } as any);
    this.logger.log(`User ${id} suspended.`);
    return this.usersService.findById(id);
  }

  async unsuspendUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.usersService.update(id, {
      isActive: true,
      verificationStatus: 'VERIFIED',
    } as any);
    this.logger.log(`User ${id} reinstated.`);
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
    // Flatten so the Review modal shows name / email / company details rather
    // than just the display ID.
    return this.usersService.flattenWithProfile(user);
  }

  // ───── Verification queue ───────────────────────────────────────────────

  /**
   * Roles that go through admin verification. Buyers and admins are
   * intentionally excluded — they don't carry a "verified provider" badge.
   */
  static readonly VERIFIABLE_ROLES = [
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
   * enum". Only these two are safe to filter the users table by.
   */
  static readonly QUERYABLE_VERIFIABLE_ROLES = ['SELLER', 'SERVICE_PROVIDER'];

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

    const merged = all
      .flatMap((p) => p.data ?? [])
      // Staff (parentProviderId set) inherit the shop owner's verification —
      // they're vouched for by the owner, not the platform admin — so they
      // never enter the verification queue.
      .filter((u) => !(u as any).parentProviderId);
    merged.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return tb - ta;
    });

    // Lightweight pagination on the merged set.
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const start = (page - 1) * limit;
    const pageRows = merged.slice(start, start + limit);
    // Phase 3: name / email / business identity live on the profile row, not
    // the users (auth) row — so the raw findAll rows carry NO name and the
    // admin queue showed anonymous display IDs. Flatten each page row so the
    // admin can see WHO (name / business) they're verifying.
    const data = await Promise.all(
      pageRows.map((u) => this.usersService.flattenWithProfile(u))
    );
    return { data, total: merged.length };
  }

  async verifyUser(id: string) {
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
    this.logger.log(`User ${id} verified.`);
    const fresh = await this.usersService.findById(id);
    return this.usersService.flattenWithProfile(fresh);
  }

  async rejectUser(id: string, reason?: string) {
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
    const fresh = await this.usersService.findById(id);
    return this.usersService.flattenWithProfile(fresh);
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
