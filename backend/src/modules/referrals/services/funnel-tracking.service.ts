import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { ReferralLink } from '../entities/referral-link.entity';
import { Conversion } from '../entities/conversion.entity';
import { Milestone } from '../entities/milestone.entity';
import { EquityAward } from '../entities/equity-award.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { ReferralCodeUtil } from '../../../utils/referral-code.util';

export type FunnelStage = 'inquiry' | 'trade_complete';

/** Where a trade_complete advancement came from (audit trail). */
export interface TradeSourceRef {
  type: 'inquiry' | 'order' | 'quote';
  id: string;
}

export interface FunnelCounts {
  registrations: number;
  inquiries: number;
  tradesComplete: number;
}

const STAGE_RANK: Record<string, number> = {
  registration: 0,
  inquiry: 1,
  trade_complete: 2,
};

/**
 * Referral funnel engine.
 *
 * Every public method is designed to be called fire-and-forget from the
 * hot paths (registration, inquiry create, order/quote completion) — it
 * must NEVER throw into its caller in a way that breaks the primary write.
 * Callers wrap with `void ...().catch(log)`, and registration additionally
 * try/catches its awaited call.
 *
 * Idempotency is enforced by the database, not by isolation:
 *   - conversions.referredUserId UNIQUE → duplicate capture is a no-op.
 *   - the guarded UPDATE in advanceStage only moves a row FORWARD; repeat
 *     events affect 0 rows.
 *   - equity_awards UNIQUE(promoter, milestone) + swallowed 23505 → two
 *     concurrent qualifying completions award exactly once.
 */
@Injectable()
export class FunnelTrackingService {
  private readonly logger = new Logger(FunnelTrackingService.name);

  constructor(
    @InjectRepository(ReferralLink)
    private readonly referralLinksRepository: Repository<ReferralLink>,
    @InjectRepository(Conversion)
    private readonly conversionsRepository: Repository<Conversion>,
    @InjectRepository(Milestone)
    private readonly milestonesRepository: Repository<Milestone>,
    @InjectRepository(EquityAward)
    private readonly equityAwardsRepository: Repository<EquityAward>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Stage: registration ──────────────────────────────────────────────

  /**
   * Record a referred registration. Called (awaited but try/caught) from
   * UsersService.register when the signup carried a referralCode.
   * Unknown/inactive codes and self-referrals are silently ignored — a bad
   * code must never surface as a registration error.
   */
  async captureRegistration(referredUserId: string, rawCode: string): Promise<void> {
    const code = ReferralCodeUtil.normalizeCode(rawCode);
    if (!code) return;

    const link = await this.referralLinksRepository.findOne({
      where: { code, isActive: true },
    });
    if (!link) {
      this.logger.warn(`captureRegistration: unknown/inactive code ${code} (user ${referredUserId})`);
      return;
    }
    if (link.promoterUserId === referredUserId) {
      this.logger.warn(`captureRegistration: self-referral blocked for ${referredUserId}`);
      return;
    }

    try {
      await this.conversionsRepository.insert({
        referralLinkId: link.id,
        promoterUserId: link.promoterUserId,
        referredUserId,
        funnelStage: 'registration',
      });
    } catch (e: any) {
      // 23505 = unique_violation: user already has a conversion row.
      if (e?.code === '23505' || e?.driverError?.code === '23505') {
        this.logger.warn(`captureRegistration: duplicate conversion for ${referredUserId} — ignored`);
        return;
      }
      throw e;
    }

    this.logger.log(`Referral captured: user ${referredUserId} via ${code} (promoter ${link.promoterUserId})`);
    this.pushReferralProgress(link.promoterUserId).catch((e) =>
      this.logger.warn(`pushReferralProgress failed: ${e.message}`),
    );
  }

  // ── Stage advancement ────────────────────────────────────────────────

  /**
   * Advance a referred user's conversion row to `targetStage` if — and only
   * if — the row is currently BEHIND that stage. One guarded UPDATE:
   * 0 rows affected means "not a referred user, or already at/past the
   * stage" — both no-ops by design (no double counting, monotonic stage).
   *
   * A referred provider can jump registration → trade_complete directly;
   * inquiryAdvancedAt stays NULL because that stage genuinely never
   * happened for them. Milestone counting reads the timestamps, not the
   * coarse stage.
   */
  async advanceStage(
    referredUserId: string,
    targetStage: FunnelStage,
    sourceRef: TradeSourceRef,
  ): Promise<void> {
    if (!referredUserId) return;

    const stampSql =
      targetStage === 'inquiry'
        ? `"inquiryAdvancedAt" = now(), "firstInquiryId" = $3,`
        : `"tradeCompleteAdvancedAt" = now(), "firstTradeSource" = $3,`;

    // NB: for UPDATE … RETURNING, TypeORM's query() resolves to
    // [rows, affectedCount] — not the bare rows array a SELECT returns.
    const [rows] = (await this.dataSource.query(
      `UPDATE conversions SET
         "funnelStage" = $1,
         ${stampSql}
         "updatedAt" = now()
       WHERE "referredUserId" = $2
         AND (CASE "funnelStage"
                WHEN 'registration' THEN 0
                WHEN 'inquiry' THEN 1
                ELSE 2
              END) < $4
       RETURNING "promoterUserId"`,
      [
        targetStage,
        referredUserId,
        targetStage === 'inquiry' ? sourceRef.id : JSON.stringify(sourceRef),
        STAGE_RANK[targetStage],
      ],
    )) as [Array<{ promoterUserId: string }>, number];

    if (!rows?.length) return;

    const promoterUserId = rows[0].promoterUserId;
    this.logger.log(
      `Funnel advance: user ${referredUserId} → ${targetStage} (promoter ${promoterUserId}, via ${sourceRef.type} ${sourceRef.id})`,
    );

    this.pushReferralProgress(promoterUserId).catch((e) =>
      this.logger.warn(`pushReferralProgress failed: ${e.message}`),
    );
    await this.checkAndAwardMilestones(promoterUserId, targetStage);
  }

  // ── Funnel counts + live push ────────────────────────────────────────

  /**
   * registrations = every referred user (all rows); inquiries /
   * tradesComplete count the independent stage timestamps, so a provider
   * who skipped the inquiry stage still counts toward trades.
   */
  async getFunnelCounts(promoterUserId: string): Promise<FunnelCounts> {
    const [registrations, inquiries, tradesComplete] = await Promise.all([
      this.conversionsRepository.count({ where: { promoterUserId } }),
      this.conversionsRepository.count({
        where: { promoterUserId, inquiryAdvancedAt: Not(IsNull()) },
      }),
      this.conversionsRepository.count({
        where: { promoterUserId, tradeCompleteAdvancedAt: Not(IsNull()) },
      }),
    ]);
    return { registrations, inquiries, tradesComplete };
  }

  /** Ephemeral live tick for the promoter dashboard funnel panel. */
  async pushReferralProgress(promoterUserId: string): Promise<void> {
    const counts = await this.getFunnelCounts(promoterUserId);
    this.notificationsService.broadcastEphemeral([promoterUserId], 'REFERRAL_PROGRESS', counts);
  }

  // ── Award engine ─────────────────────────────────────────────────────

  /**
   * Grant every active milestone at `stage` whose threshold this promoter
   * has now crossed. Runs after each advancement AND from the admin sweep
   * (milestone create/update) — both paths converge on the same
   * unique-constraint idempotency, so double invocation is harmless.
   */
  async checkAndAwardMilestones(promoterUserId: string, stage: FunnelStage): Promise<void> {
    const milestones = await this.milestonesRepository.find({
      where: { targetStage: stage, isActive: true },
    });
    if (!milestones.length) return;

    const stampColumn = stage === 'inquiry' ? 'inquiryAdvancedAt' : 'tradeCompleteAdvancedAt';
    const count = await this.conversionsRepository.count({
      where: { promoterUserId, [stampColumn]: Not(IsNull()) },
    });

    for (const milestone of milestones) {
      if (count < milestone.requiredCount) continue;
      await this.tryAward(promoterUserId, milestone, count);
    }
  }

  /**
   * Admin sweep: after a milestone is created/edited, award every promoter
   * who ALREADY qualifies (otherwise a milestone added late would only ever
   * fire on the next funnel event). Unique constraint keeps it idempotent.
   */
  async sweepMilestone(milestone: Milestone): Promise<void> {
    if (!milestone.isActive) return;
    const stampColumn =
      milestone.targetStage === 'inquiry' ? 'inquiryAdvancedAt' : 'tradeCompleteAdvancedAt';

    const qualifiers: Array<{ promoterUserId: string; qualifying: string }> =
      await this.conversionsRepository.query(
        `SELECT "promoterUserId", COUNT(*) AS qualifying
           FROM conversions
          WHERE "${stampColumn}" IS NOT NULL
          GROUP BY "promoterUserId"
         HAVING COUNT(*) >= $1`,
        [milestone.requiredCount],
      );

    for (const q of qualifiers) {
      await this.tryAward(q.promoterUserId, milestone, Number(q.qualifying));
    }
  }

  /**
   * Insert-or-skip a single award. The UNIQUE(promoterUserId, milestoneId)
   * constraint is the concurrency model: concurrent qualifiers both attempt
   * the INSERT, Postgres rejects the loser with 23505, we swallow it.
   */
  private async tryAward(promoterUserId: string, milestone: Milestone, countAtAward: number): Promise<void> {
    try {
      await this.equityAwardsRepository.insert({
        promoterUserId,
        milestoneId: milestone.id,
        sharesAwarded: milestone.equitySharesReward,
        countAtAward,
      });
    } catch (e: any) {
      if (e?.code === '23505' || e?.driverError?.code === '23505') {
        this.logger.warn(
          `tryAward: milestone ${milestone.id} already awarded to ${promoterUserId} — skipped (23505)`,
        );
        return;
      }
      throw e;
    }

    const totalEquityShares = await this.getTotalShares(promoterUserId);
    this.logger.log(
      `Milestone unlocked: "${milestone.title}" → promoter ${promoterUserId} (+${milestone.equitySharesReward} shares, total ${totalEquityShares})`,
    );

    void this.notificationsService
      .notifyUsers([promoterUserId], 'MILESTONE_UNLOCKED', () => ({
        title: `Milestone unlocked: ${milestone.title}`,
        data: {
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          sharesAwarded: Number(milestone.equitySharesReward),
          totalEquityShares,
        },
      }))
      .catch((e) => this.logger.warn(`MILESTONE_UNLOCKED dispatch failed: ${e.message}`));
  }

  async getTotalShares(promoterUserId: string): Promise<number> {
    const { total } = await this.equityAwardsRepository
      .createQueryBuilder('award')
      .select('COALESCE(SUM(award.sharesAwarded), 0)', 'total')
      .where('award.promoterUserId = :promoterUserId', { promoterUserId })
      .getRawOne();
    return Number(total);
  }
}
