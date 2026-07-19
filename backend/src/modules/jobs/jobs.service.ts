import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { ESCROW_HOLDING_STATUSES } from '../quotes/quote-status';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { User } from '../users/entities/user.entity';
import { JobMedia } from './entities/job-media.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PERMISSIONS } from '../../common/constants/permissions';
import { AddJobMediaDto } from './dto/add-job-media.dto';

/** The authed caller shape JwtStrategy attaches to req.user. */
export interface JobsCaller {
  id: string;
  role: string;
  parentProviderId?: string | null;
  permissions?: string[];
}

const HISTORY_STATUSES = ['COMPLETED', 'HANDED_OVER'] as const;

/**
 * Jobs = paid quotes viewed as field work. Owners assign a job to a
 * TECHNICIAN team member; the technician captures before/after evidence.
 *
 * AUTHORIZATION IS MANUAL HERE — deliberately no PermissionsGuard. Its
 * owner-bypass treats ANY account without parentProviderId (including buyers
 * and admins) as a shop owner, and the media endpoints have four distinct
 * legitimate caller types (owner / assigned technician / the quote's buyer /
 * admin) that no single @RequirePermissions decorator can express.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Quote) private readonly quotesRepository: Repository<Quote>,
    @InjectRepository(JobMedia) private readonly jobMediaRepository: Repository<JobMedia>,
    @InjectRepository(Inquiry) private readonly inquiriesRepository: Repository<Inquiry>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Staff caller shaped like a technician (parented + MANAGE_JOBS). */
  private isTechnicianCaller(user: JobsCaller): boolean {
    return Boolean(
      user.parentProviderId && (user.permissions ?? []).includes(PERMISSIONS.MANAGE_JOBS),
    );
  }

  /**
   * Shop-owner check. Mirrors CollectionController.shopId(): role must be a
   * shop role AND the account must be top-level — `!parentProviderId` alone
   * would also match buyers/admins.
   */
  private isOwnerCaller(user: JobsCaller): boolean {
    return (
      (user.role === 'SELLER' || user.role === 'SERVICE_PROVIDER') && !user.parentProviderId
    );
  }

  private async getQuoteOrThrow(quoteId: string): Promise<Quote> {
    const quote = await this.quotesRepository.findOne({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Job not found');
    return quote;
  }

  // ── Job list ─────────────────────────────────────────────────────────

  /**
   * Technician → only quotes assigned to them. Owner → their whole book.
   * `scope`: active (escrow-holding, i.e. paid & not yet handed over) or
   * history (completed/handed over).
   */
  async list(user: JobsCaller, scope: 'active' | 'history' = 'active') {
    const statuses =
      scope === 'history' ? [...HISTORY_STATUSES] : [...ESCROW_HOLDING_STATUSES];

    let where: Record<string, any>;
    if (this.isTechnicianCaller(user)) {
      where = { assignedTechnicianId: user.id, status: In(statuses) };
    } else if (this.isOwnerCaller(user)) {
      where = { providerId: user.id, status: In(statuses) };
    } else {
      throw new ForbiddenException('Only shops and technicians can access jobs');
    }

    const quotes = await this.quotesRepository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
    if (quotes.length === 0) return [];

    // Enrichment: inquiry (buyer + attributes incl. vehicle details/VIN),
    // display names, and per-phase evidence counts — batched, no relations.
    const inquiryIds = Array.from(new Set(quotes.map((q) => q.inquiryId)));
    const inquiries = await this.inquiriesRepository.find({ where: { id: In(inquiryIds) } });
    const inquiryById = new Map(inquiries.map((i) => [i.id, i]));

    const nameIds = [
      ...inquiries.map((i) => i.buyerId),
      ...quotes.map((q) => q.assignedTechnicianId).filter(Boolean),
    ] as string[];
    const identities = await this.usersService.resolveDisplayIdentities(nameIds);

    const counts = await this.jobMediaRepository
      .createQueryBuilder('m')
      .select('m.quoteId', 'quoteId')
      .addSelect('m.phase', 'phase')
      .addSelect('COUNT(*)', 'count')
      .where('m.quoteId IN (:...ids)', { ids: quotes.map((q) => q.id) })
      .groupBy('m.quoteId')
      .addGroupBy('m.phase')
      .getRawMany<{ quoteId: string; phase: string; count: string }>();
    const countByQuote = new Map<string, { before: number; after: number }>();
    for (const row of counts) {
      const entry = countByQuote.get(row.quoteId) ?? { before: 0, after: 0 };
      if (row.phase === 'BEFORE') entry.before = Number(row.count);
      if (row.phase === 'AFTER') entry.after = Number(row.count);
      countByQuote.set(row.quoteId, entry);
    }

    return quotes.map((q) => {
      const inquiry = inquiryById.get(q.inquiryId);
      const media = countByQuote.get(q.id) ?? { before: 0, after: 0 };
      return {
        id: q.id,
        inquiryId: q.inquiryId,
        inquiryTitle: q.inquiryTitle,
        status: q.status,
        price: q.price,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        assignedTechnicianId: q.assignedTechnicianId,
        technicianName: q.assignedTechnicianId
          ? (identities.get(q.assignedTechnicianId)?.name ?? null)
          : null,
        buyerId: inquiry?.buyerId ?? null,
        buyerName: inquiry?.buyerId ? (identities.get(inquiry.buyerId)?.name ?? null) : null,
        location: inquiry?.location ?? null,
        attributes: inquiry?.attributes ?? {},
        beforeCount: media.before,
        afterCount: media.after,
      };
    });
  }

  // ── Assignment ───────────────────────────────────────────────────────

  async assign(user: JobsCaller, quoteId: string, technicianId: string | null) {
    if (!this.isOwnerCaller(user)) {
      throw new ForbiddenException('Only the shop owner can assign jobs');
    }
    const quote = await this.getQuoteOrThrow(quoteId);
    if (quote.providerId !== user.id) {
      throw new ForbiddenException('You can only assign your own jobs');
    }

    if (technicianId) {
      const technician = await this.usersRepository.findOne({ where: { id: technicianId } });
      // permissions is a simple-array TEXT column — always JS-filter after
      // load, never SQL ANY()/@> (documented users-entity invariant).
      const holds = (technician?.permissions ?? []).includes(PERMISSIONS.MANAGE_JOBS);
      if (
        !technician ||
        technician.parentProviderId !== user.id ||
        !holds ||
        !technician.isActive
      ) {
        throw new BadRequestException('Not an active technician on your team');
      }
    }

    quote.assignedTechnicianId = technicianId;
    const saved = await this.quotesRepository.save(quote);

    if (technicianId) {
      // Best-effort: assignment must not fail because notification dispatch did.
      try {
        await this.notificationsService.notifyUsers([technicianId], 'JOB_ASSIGNED', () => ({
          title: `New job assigned: ${quote.inquiryTitle}`,
          inquiryId: quote.inquiryId,
          quoteId: quote.id,
        }));
      } catch (err) {
        this.logger.error(`JOB_ASSIGNED dispatch failed for quote ${quote.id}`, err as Error);
      }
    }

    return { id: saved.id, assignedTechnicianId: saved.assignedTechnicianId };
  }

  // ── Evidence ─────────────────────────────────────────────────────────

  async addMedia(user: JobsCaller, quoteId: string, dto: AddJobMediaDto) {
    const quote = await this.getQuoteOrThrow(quoteId);
    const isOwner = this.isOwnerCaller(user) && quote.providerId === user.id;
    const isAssigned = quote.assignedTechnicianId === user.id && this.isTechnicianCaller(user);
    if (!isOwner && !isAssigned) {
      throw new ForbiddenException('Only the owner or the assigned technician can add evidence');
    }
    // Evidence files ride the public uploads pipeline; reject anything else
    // so buyer-visible galleries can never point at arbitrary external URLs.
    if (!dto.url.includes('/uploads/')) {
      throw new BadRequestException('Evidence must be uploaded through /files/upload');
    }

    // Notify the buyer the FIRST time after-service evidence lands on a job —
    // not on every one of a burst of photos.
    let notifyBuyer = false;
    if (dto.phase === 'AFTER') {
      const existingAfter = await this.jobMediaRepository.count({
        where: { quoteId: quote.id, phase: 'AFTER' },
      });
      notifyBuyer = existingAfter === 0;
    }

    const saved = await this.jobMediaRepository.save(
      this.jobMediaRepository.create({
        quoteId: quote.id,
        capturedById: user.id,
        phase: dto.phase,
        mediaType: dto.mediaType,
        url: dto.url,
        note: dto.note ?? null,
      }),
    );

    if (notifyBuyer) {
      try {
        const inquiry = await this.inquiriesRepository.findOne({
          where: { id: quote.inquiryId },
        });
        if (inquiry?.buyerId) {
          await this.notificationsService.notifyUsers([inquiry.buyerId], 'JOB_EVIDENCE_ADDED', () => ({
            title: `Service evidence added for "${quote.inquiryTitle}"`,
            inquiryId: quote.inquiryId,
            quoteId: quote.id,
          }));
        }
      } catch (err) {
        this.logger.error(
          `JOB_EVIDENCE_ADDED dispatch failed for quote ${quote.id}`,
          err as Error,
        );
      }
    }

    return saved;
  }

  /**
   * Four legitimate caller types: shop owner, assigned technician, the
   * quote's buyer (reached through the inquiry — quotes carry no buyerId),
   * and admins (dispute review).
   */
  async listMedia(user: JobsCaller, quoteId: string) {
    const quote = await this.getQuoteOrThrow(quoteId);
    const isOwner = this.isOwnerCaller(user) && quote.providerId === user.id;
    const isAssigned = quote.assignedTechnicianId === user.id && this.isTechnicianCaller(user);
    const isAdmin = user.role === 'ADMIN';
    let isBuyer = false;
    if (!isOwner && !isAssigned && !isAdmin) {
      const inquiry = await this.inquiriesRepository.findOne({ where: { id: quote.inquiryId } });
      isBuyer = Boolean(inquiry && inquiry.buyerId === user.id);
    }
    if (!isOwner && !isAssigned && !isAdmin && !isBuyer) {
      throw new ForbiddenException('You are not a party to this job');
    }

    return this.jobMediaRepository.find({
      where: { quoteId: quote.id },
      order: { createdAt: 'ASC' },
    });
  }
}
