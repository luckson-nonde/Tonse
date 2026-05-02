import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { InquiriesService } from '../inquiries/inquiries.service';
import { QuotesService } from '../quotes/quotes.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly inquiriesService: InquiriesService,
    private readonly quotesService: QuotesService,
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService
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

    return {
      users: {
        total: usersPage.total,
        byRole: usersByRole,
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
      generatedAt: new Date().toISOString(),
    };
  }

  // ───── User management ──────────────────────────────────────────────────

  async listUsers(filters: Record<string, any> = {}) {
    return this.usersService.findAll(filters);
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
    return user;
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

  async listVerifications(filters: Record<string, any> = {}) {
    // Default queue: all PENDING users in the verifiable role groups, newest
    // first. The admin can toggle by status (PENDING/VERIFIED/REJECTED) or
    // narrow to a single role.
    const status = filters.status || 'PENDING';
    const role = filters.role;
    const requestedRoles = role ? [role] : AdminService.VERIFIABLE_ROLES;

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
    const metadata = { ...((user as any).metadata || {}) };
    delete metadata.verificationRejectionReason;
    metadata.verifiedAt = new Date().toISOString();

    await this.usersService.update(id, {
      verificationStatus: 'VERIFIED',
      isActive: true,
      isNrcVerified: true,
      metadata,
    } as any);
    this.logger.log(`User ${id} verified.`);
    return this.usersService.findById(id);
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
    const metadata = { ...((user as any).metadata || {}) };
    metadata.verificationRejectionReason = reason || 'No reason provided';
    metadata.rejectedAt = new Date().toISOString();
    delete metadata.verifiedAt;

    await this.usersService.update(id, {
      verificationStatus: 'REJECTED',
      metadata,
    } as any);
    this.logger.log(`User ${id} verification rejected: ${reason ?? '(no reason)'}`);
    return this.usersService.findById(id);
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
