import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { ReferralLink } from '../entities/referral-link.entity';
import { CreateMilestoneDto } from '../dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { FunnelTrackingService } from './funnel-tracking.service';

/**
 * Admin-facing milestone CRUD. Consumed by AdminService (composition
 * pattern — AdminModule imports ReferralsModule and injects this).
 *
 * Every mutation does two follow-ups, both non-fatal:
 *   1. sweepMilestone — award promoters who ALREADY qualify (a milestone
 *      created after the fact must not wait for the next funnel event).
 *   2. broadcastMilestoneUpdated — ephemeral SSE so open promoter
 *      dashboards refetch their goals without a manual reload.
 */
@Injectable()
export class MilestonesService {
  private readonly logger = new Logger(MilestonesService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestonesRepository: Repository<Milestone>,
    @InjectRepository(ReferralLink)
    private readonly referralLinksRepository: Repository<ReferralLink>,
    private readonly notificationsService: NotificationsService,
    private readonly funnelTrackingService: FunnelTrackingService,
  ) {}

  async list(): Promise<Milestone[]> {
    return this.milestonesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateMilestoneDto): Promise<Milestone> {
    const saved = await this.milestonesRepository.save(this.milestonesRepository.create(dto));
    await this.afterMutation(saved, 'created');
    return saved;
  }

  async update(id: string, dto: UpdateMilestoneDto): Promise<Milestone> {
    const milestone = await this.milestonesRepository.findOne({ where: { id } });
    if (!milestone) throw new NotFoundException(`Milestone ${id} not found`);
    Object.assign(milestone, dto);
    const saved = await this.milestonesRepository.save(milestone);
    await this.afterMutation(saved, 'updated');
    return saved;
  }

  async remove(id: string): Promise<void> {
    const milestone = await this.milestonesRepository.findOne({ where: { id } });
    if (!milestone) throw new NotFoundException(`Milestone ${id} not found`);
    try {
      await this.milestonesRepository.delete({ id });
    } catch (e: any) {
      // 23503 = foreign_key_violation: equity_awards.milestoneId is RESTRICT.
      if (e?.code === '23503' || e?.driverError?.code === '23503') {
        throw new ConflictException(
          'This milestone has already awarded shares and cannot be deleted — deactivate it instead.',
        );
      }
      throw e;
    }
    this.broadcastMilestoneUpdated(id, 'deleted');
  }

  private async afterMutation(milestone: Milestone, action: string): Promise<void> {
    // Retro-award sweep: idempotent (unique constraint), so re-running on
    // every edit is safe. Non-fatal — the CRUD result stands regardless.
    try {
      await this.funnelTrackingService.sweepMilestone(milestone);
    } catch (e: any) {
      this.logger.warn(`sweepMilestone(${milestone.id}) failed: ${e.message}`);
    }
    this.broadcastMilestoneUpdated(milestone.id, action);
  }

  /** Ephemeral push to every active promoter's open dashboard. */
  private broadcastMilestoneUpdated(milestoneId: string, action: string): void {
    void this.referralLinksRepository
      .find({ where: { isActive: true }, select: ['promoterUserId'] })
      .then((links) => {
        if (!links.length) return;
        this.notificationsService.broadcastEphemeral(
          links.map((l) => l.promoterUserId),
          'MILESTONE_UPDATED',
          { milestoneId, action },
        );
      })
      .catch((e) => this.logger.warn(`broadcastMilestoneUpdated failed: ${e.message}`));
  }
}
