import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobPosting } from './entities/job-posting.entity';
import { JobPostingCategory } from './entities/job-posting-category.entity';
import { JobApplication } from './entities/job-application.entity';
import { ApplyToJobDto, CreateJobPostingDto, UpdateJobPostingDto } from './dto';
import { CategoriesService } from '../categories/categories.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingService } from '../billing/billing.service';
import { LedgerService } from '../ledger/ledger.service';
import { ACCOUNT } from '../ledger/ledger-accounts';
import { toNgwee } from '../../common/money/money';

/** Postgres unique-violation SQLSTATE — the double-apply guard's error. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * What makes a `service_provider_profiles pp` row an employment account —
 * i.e. someone the job board is FOR. Two arms on purpose:
 *
 *  1. subRole — how the "Looking for Employment" signup lands.
 *  2. any registered labour trade — before the board was ungated, eligibility
 *     was a category join, so providers holding labour trades under another
 *     subRole could already apply. Collapsing to arm 1 alone would silently
 *     lock those existing accounts out.
 *
 * Used by both the apply gate and the new-job alert audience; they must agree,
 * or we'd notify people who then get a 403 when they act on it.
 */
const EMPLOYMENT_ACCOUNT_PREDICATE = `(
  pp."subRole" = 'SKILLED_LABOUR'
  OR EXISTS (
    SELECT 1
      FROM service_provider_profile_categories spc
      JOIN categories c ON c.id = spc."categoryId"
     WHERE spc."serviceProviderProfileId" = pp.id
       AND c."parentId" = 'labour'
  )
)`;

/** Minimal identity used for both applicant cards and poster reveal. */
export interface JobBoardContact {
  userId: string;
  name: string | null;
  role: string;
  phone?: string | null;
  email?: string | null;
}

@Injectable()
export class JobBoardService {
  private readonly logger = new Logger(JobBoardService.name);

  constructor(
    @InjectRepository(JobPosting)
    private readonly postingsRepository: Repository<JobPosting>,
    @InjectRepository(JobPostingCategory)
    private readonly postingCategoriesRepository: Repository<JobPostingCategory>,
    @InjectRepository(JobApplication)
    private readonly applicationsRepository: Repository<JobApplication>,
    private readonly dataSource: DataSource,
    private readonly categoriesService: CategoriesService,
    private readonly notificationsService: NotificationsService,
    private readonly billingService: BillingService,
    private readonly ledger: LedgerService,
  ) {}

  // ── Poster surface ───────────────────────────────────────────────────

  async createPosting(posterId: string, dto: CreateJobPostingDto): Promise<any> {
    const { tradeCategoryIds, applicationDeadline, ...rest } = dto;
    const uniqueTradeIds = Array.from(new Set(tradeCategoryIds));
    await this.assertLabourTrades(uniqueTradeIds);

    // Admin-controlled posting fee (billing_settings). When it's on, the
    // posting parks at PENDING_PAYMENT — invisible to the admin queue — until
    // paid via venture balance or PSP checkout (ads pattern). The price is
    // snapshotted so a later admin edit never changes what THIS poster owes.
    const fee = await this.billingService.getActiveJobPostingFee();

    const saved = await this.dataSource.transaction(async (manager) => {
      const postingRepo = manager.getRepository(JobPosting);
      const junctionRepo = manager.getRepository(JobPostingCategory);
      const posting = await postingRepo.save(
        postingRepo.create({
          ...rest,
          posterId,
          applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
          status: fee !== null ? 'PENDING_PAYMENT' : 'PENDING_APPROVAL',
          feeAmount: fee,
        }),
      );
      await junctionRepo.save(
        uniqueTradeIds.map((categoryId) =>
          junctionRepo.create({ jobPostingId: posting.id, categoryId }),
        ),
      );
      return posting;
    });
    return { ...saved, tradeCategoryIds: uniqueTradeIds };
  }

  async listMyPostings(posterId: string): Promise<any[]> {
    const postings = await this.postingsRepository.find({
      where: { posterId },
      order: { createdAt: 'DESC' },
    });
    if (postings.length === 0) return [];
    const ids = postings.map((p) => p.id);
    const [tradesByPosting, counts] = await Promise.all([
      this.loadTradeIds(ids),
      this.dataSource.query(
        `SELECT "jobPostingId",
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
                COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted
           FROM job_applications
          WHERE "jobPostingId" = ANY($1)
          GROUP BY "jobPostingId"`,
        [ids],
      ) as Promise<Array<{ jobPostingId: string; total: number; pending: number; accepted: number }>>,
    ]);
    const countByPosting = new Map(counts.map((c) => [c.jobPostingId, c]));
    return postings.map((p) => ({
      ...p,
      tradeCategoryIds: tradesByPosting.get(p.id) ?? [],
      applicationsCount: countByPosting.get(p.id)?.total ?? 0,
      pendingApplicationsCount: countByPosting.get(p.id)?.pending ?? 0,
      acceptedApplicationsCount: countByPosting.get(p.id)?.accepted ?? 0,
    }));
  }

  /**
   * One posting with its applicant list — poster-only. Contact fields
   * (phone/email) are included ONLY on ACCEPTED applications; the reveal
   * gate lives here so no client can request them early.
   */
  async getPostingWithApplicants(id: string, posterId: string): Promise<any> {
    const posting = await this.postingsRepository.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.posterId !== posterId) {
      throw new ForbiddenException('Only the poster can view a posting\'s applicants');
    }
    const [tradesByPosting, applications] = await Promise.all([
      this.loadTradeIds([id]),
      this.applicationsRepository.find({
        where: { jobPostingId: id },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const profiles = await this.fetchApplicantProfiles(
      applications.map((a) => a.applicantUserId),
    );
    return {
      ...posting,
      tradeCategoryIds: tradesByPosting.get(id) ?? [],
      applications: applications.map((a) => {
        const profile = profiles.get(a.applicantUserId);
        const accepted = a.status === 'ACCEPTED';
        return {
          id: a.id,
          jobPostingId: a.jobPostingId,
          status: a.status,
          coverMessage: a.coverMessage,
          expectedRate: a.expectedRate,
          rateUnit: a.rateUnit,
          availabilityDate: a.availabilityDate,
          // Requirement evidence is what the poster JUDGES the application
          // on, so unlike contact details it is visible before accepting.
          attachments: a.attachments ?? [],
          respondedAt: a.respondedAt,
          createdAt: a.createdAt,
          applicant: {
            userId: a.applicantUserId,
            name: profile?.name ?? 'Applicant',
            profilePicture: profile?.profilePicture ?? null,
            city: profile?.city ?? null,
            trades: profile?.trades ?? [],
            // The reveal: contact only once the poster has accepted.
            phone: accepted ? profile?.phone ?? null : null,
            email: accepted ? profile?.email ?? null : null,
          },
        };
      }),
    };
  }

  /** Edit-and-resubmit a REJECTED posting: back into the review queue. */
  async resubmitPosting(id: string, posterId: string, dto: UpdateJobPostingDto): Promise<any> {
    const posting = await this.postingsRepository.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.posterId !== posterId) {
      throw new ForbiddenException('Only the poster can edit a posting');
    }
    if (posting.status !== 'REJECTED') {
      throw new ConflictException('Only rejected postings can be edited and resubmitted');
    }
    const { tradeCategoryIds, applicationDeadline, ...rest } = dto;
    const uniqueTradeIds = tradeCategoryIds ? Array.from(new Set(tradeCategoryIds)) : null;
    if (uniqueTradeIds) await this.assertLabourTrades(uniqueTradeIds);

    const saved = await this.dataSource.transaction(async (manager) => {
      const postingRepo = manager.getRepository(JobPosting);
      const junctionRepo = manager.getRepository(JobPostingCategory);
      Object.assign(posting, rest);
      if (applicationDeadline !== undefined) {
        posting.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null;
      }
      posting.status = 'PENDING_APPROVAL';
      posting.rejectionReason = null;
      posting.approvedByAdminId = null;
      const updated = await postingRepo.save(posting);
      if (uniqueTradeIds) {
        await junctionRepo.delete({ jobPostingId: id });
        await junctionRepo.save(
          uniqueTradeIds.map((categoryId) =>
            junctionRepo.create({ jobPostingId: id, categoryId }),
          ),
        );
      }
      return updated;
    });
    const trades = uniqueTradeIds ?? (await this.loadTradeIds([id])).get(id) ?? [];
    return { ...saved, tradeCategoryIds: trades };
  }

  async closePosting(id: string, posterId: string): Promise<JobPosting> {
    return this.transitionOwnPosting(id, posterId, ['APPROVED', 'FILLED'], 'CLOSED');
  }

  async markFilled(id: string, posterId: string): Promise<JobPosting> {
    return this.transitionOwnPosting(id, posterId, ['APPROVED'], 'FILLED');
  }

  /**
   * Pay a PENDING_PAYMENT posting straight out of the poster's venture
   * balance — an internal transfer, no PSP round-trip (ads pattern). Two
   * escape hatches promote the posting FREE instead of charging: the admin
   * turned the fee off after this posting was created, or the snapshot is
   * zero — money must never be taken for a feature that is now free.
   */
  async payFromBalance(id: string, posterId: string): Promise<JobPosting> {
    const posting = await this.postingsRepository.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.posterId !== posterId) {
      throw new ForbiddenException('This job posting is not yours to pay for');
    }
    if (posting.status !== 'PENDING_PAYMENT') {
      throw new ConflictException(`This posting can't be paid from status ${posting.status}`);
    }

    const feeStillOn = (await this.billingService.getActiveJobPostingFee()) !== null;
    const amount = Number(posting.feeAmount ?? 0);
    if (feeStillOn && amount > 0) {
      const balance = await this.ledger.sellerBalance(posterId);
      if (Number(balance) < amount) {
        throw new BadRequestException('Insufficient account balance');
      }
      await this.ledger.postJournal({
        type: 'JOB_POST_FEE',
        idempotencyKey: `job-post-balance:${posting.id}`,
        currency: 'ZMW',
        description: `Job posting fee — ${posting.title}`,
        memo: { jobPostingId: posting.id, source: 'VENTURE_BALANCE' },
        lines: [
          { accountCode: ACCOUNT.SELLER_PAYABLE, direction: 'DEBIT', amountNgwee: toNgwee(String(amount)), counterpartyId: posterId },
          { accountCode: ACCOUNT.JOB_BOARD_REVENUE, direction: 'CREDIT', amountNgwee: toNgwee(String(amount)) },
        ],
      });
    }

    posting.status = 'PENDING_APPROVAL';
    return this.postingsRepository.save(posting);
  }

  async acceptApplication(applicationId: string, posterId: string): Promise<any> {
    return this.respondToApplication(applicationId, posterId, 'ACCEPTED');
  }

  async rejectApplication(applicationId: string, posterId: string): Promise<any> {
    return this.respondToApplication(applicationId, posterId, 'REJECTED');
  }

  // ── Seeker surface ───────────────────────────────────────────────────

  /**
   * Every approved, still-open posting on the platform — the whole job
   * board, not a trade-matched slice.
   *
   * This used to inner-join the seeker's registered trade categories, so a
   * carpenter never saw a driver vacancy and a seeker with no registered
   * trades saw nothing at all. An employment account is no longer a
   * statement about which trades you do; it's an account for seeing what
   * work is going. Trades survive only as a card tag and an optional
   * client-side filter, so browsing is a search problem, not a matching one.
   *
   * No junction join means no duplicate rows, so the old IN-subquery dedup
   * is gone too — which also sidesteps the json-DISTINCT trap (`attributes`
   * is json and Postgres has no equality operator for it, so a SELECT
   * DISTINCT over jp.* 500s; don't reintroduce one).
   */
  async listOpenJobs(userId: string): Promise<any[]> {
    const rows: JobPosting[] = await this.dataSource.query(
      `SELECT jp.*
         FROM job_postings jp
        WHERE jp.status = 'APPROVED'
          AND jp."posterId" <> $1
          AND (jp."applicationDeadline" IS NULL OR jp."applicationDeadline" > NOW())
        ORDER BY jp."createdAt" DESC`,
      [userId],
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [tradesByPosting, myApplications, posterContacts, applicantTallies] = await Promise.all([
      this.loadTradeIds(ids),
      this.applicationsRepository.find({
        where: { applicantUserId: userId },
        select: ['jobPostingId', 'status'],
      }),
      this.fetchContacts(rows.map((r) => r.posterId)),
      // How contested each vacancy is — shown to seekers on the card, so a
      // count only (never who applied; that stays poster-side).
      this.dataSource.query(
        `SELECT "jobPostingId", COUNT(*)::int AS total
           FROM job_applications
          WHERE "jobPostingId" = ANY($1)
          GROUP BY "jobPostingId"`,
        [ids],
      ) as Promise<Array<{ jobPostingId: string; total: number }>>,
    ]);
    const myAppByPosting = new Map(myApplications.map((a) => [a.jobPostingId, a.status]));
    const tallyByPosting = new Map(applicantTallies.map((t) => [t.jobPostingId, t.total]));
    return rows.map((p) => ({
      ...p,
      tradeCategoryIds: tradesByPosting.get(p.id) ?? [],
      posterName: posterContacts.get(p.posterId)?.name ?? 'Nyuwe member',
      applicantsCount: tallyByPosting.get(p.id) ?? 0,
      hasApplied: myAppByPosting.has(p.id),
      myApplicationStatus: myAppByPosting.get(p.id) ?? null,
    }));
  }

  // ── Public surface (no session) ──────────────────────────────────────

  /**
   * The whole open board, for an anonymous `/discover` visitor — same query
   * as `listOpenJobs` minus the caller-exclusion and the per-applicant
   * fields (`hasApplied`/`myApplicationStatus` don't exist without a
   * session). Every row goes through `toPublicPosting`'s explicit allowlist,
   * never a raw spread, so an internal column added to `JobPosting` later
   * can't silently leak into a public response.
   */
  async listPublicJobs(): Promise<any[]> {
    const rows: JobPosting[] = await this.dataSource.query(
      `SELECT jp.*
         FROM job_postings jp
        WHERE jp.status = 'APPROVED'
          AND (jp."applicationDeadline" IS NULL OR jp."applicationDeadline" > NOW())
        ORDER BY jp."createdAt" DESC`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [tradesByPosting, posterContacts, applicantTallies] = await Promise.all([
      this.loadTradeIds(ids),
      this.fetchContacts(rows.map((r) => r.posterId)),
      // A count only — never who applied; that stays poster-side.
      this.dataSource.query(
        `SELECT "jobPostingId", COUNT(*)::int AS total
           FROM job_applications
          WHERE "jobPostingId" = ANY($1)
          GROUP BY "jobPostingId"`,
        [ids],
      ) as Promise<Array<{ jobPostingId: string; total: number }>>,
    ]);
    const tallyByPosting = new Map(applicantTallies.map((t) => [t.jobPostingId, t.total]));
    return rows.map((p) =>
      this.toPublicPosting(
        p,
        tradesByPosting.get(p.id) ?? [],
        posterContacts.get(p.posterId)?.name ?? 'Nyuwe member',
        tallyByPosting.get(p.id) ?? 0,
      ),
    );
  }

  /**
   * One posting for an anonymous visitor. Stricter than the poster-only
   * `getPostingWithApplicants`: a PENDING_APPROVAL or REJECTED id 404s
   * exactly like a missing one, so the public surface can never confirm a
   * posting exists before it's actually live. No applicants array.
   */
  async getPublicJobPosting(id: string): Promise<any> {
    const posting = await this.postingsRepository.findOne({ where: { id } });
    if (!posting || posting.status !== 'APPROVED') {
      throw new NotFoundException('Job posting not found');
    }
    const [tradesByPosting, posterContacts, tally] = await Promise.all([
      this.loadTradeIds([id]),
      this.fetchContacts([posting.posterId]),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM job_applications WHERE "jobPostingId" = $1`,
        [id],
      ) as Promise<Array<{ total: number }>>,
    ]);
    return this.toPublicPosting(
      posting,
      tradesByPosting.get(id) ?? [],
      posterContacts.get(posting.posterId)?.name ?? 'Nyuwe member',
      tally[0]?.total ?? 0,
    );
  }

  /** The public allowlist shared by both methods above — explicit fields,
   *  never a spread. Deliberately omits feeAmount/rejectionReason/
   *  approvedByAdminId (operational internals) and any applicant identity. */
  private toPublicPosting(
    p: JobPosting,
    tradeCategoryIds: string[],
    posterName: string,
    applicantsCount: number,
  ) {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      workersNeeded: p.workersNeeded,
      payOffer: p.payOffer,
      payRateUnit: p.payRateUnit,
      applicationDeadline: p.applicationDeadline,
      location: p.location,
      province: p.province,
      city: p.city,
      attributes: p.attributes,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tradeCategoryIds,
      posterName,
      applicantsCount,
    };
  }

  async applyToJob(jobPostingId: string, applicantUserId: string, dto: ApplyToJobDto): Promise<any> {
    const posting = await this.postingsRepository.findOne({ where: { id: jobPostingId } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.posterId === applicantUserId) {
      throw new BadRequestException('You cannot apply to your own job posting');
    }
    if (posting.status !== 'APPROVED') {
      throw new ConflictException('This job is no longer accepting applications');
    }
    if (posting.applicationDeadline && posting.applicationDeadline.getTime() <= Date.now()) {
      throw new ConflictException('The application deadline for this job has passed');
    }
    // Eligibility is now "do you hold an employment account", not "do your
    // registered trades match THIS posting". A jobseeker applies for the work
    // they want, not only the work their signup trade box happens to name.
    //
    // Two ways to qualify, deliberately: the subRole (how the Looking for
    // Employment signup lands) OR any registered labour trade. The second arm
    // is not redundant — before this change eligibility was a category join,
    // so providers who registered labour trades under some other subRole could
    // already apply. Dropping them to satisfy a tidier one-line check would be
    // a silent regression for existing accounts.
    const eligible: Array<{ ok: number }> = await this.dataSource.query(
      `SELECT 1 AS ok
         FROM service_provider_profiles pp
        WHERE pp."userId" = $1
          AND ${EMPLOYMENT_ACCOUNT_PREDICATE}
        LIMIT 1`,
      [applicantUserId],
    );
    if (eligible.length === 0) {
      throw new ForbiddenException(
        'Register a Looking for Employment account to apply for jobs',
      );
    }

    // Every document the posting demands must actually be attached. The apply
    // modal blocks on the same list client-side; this is the authority.
    const requiredSlots = this.getRequiredAttachmentSlots(posting.attributes);
    if (requiredSlots.length > 0) {
      const provided = new Set((dto.attachments ?? []).map((a) => a.label));
      const missing = requiredSlots.filter((label) => !provided.has(label));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Attach the required documents before applying: ${missing.join(', ')}`,
        );
      }
    }

    let saved: JobApplication;
    try {
      saved = await this.applicationsRepository.save(
        this.applicationsRepository.create({
          jobPostingId,
          applicantUserId,
          coverMessage: dto.coverMessage,
          expectedRate: dto.expectedRate,
          rateUnit: dto.rateUnit,
          availabilityDate: dto.availabilityDate,
          attachments: dto.attachments?.length ? dto.attachments : null,
          status: 'PENDING',
        }),
      );
    } catch (e: any) {
      if (e?.code === PG_UNIQUE_VIOLATION || e?.driverError?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('You have already applied to this job');
      }
      throw e;
    }

    // Post-mutation, never fails the applicant's 201.
    void this.notifyPoster(posting, 'NEW_JOB_APPLICATION', {
      title: `New application: ${posting.title}`,
      data: { jobPostingId, applicationId: saved.id },
    });
    return saved;
  }

  /** The seeker's own applications, with a posting snapshot each. Poster
   *  contact is included once (and only once) the application is ACCEPTED. */
  async listMyApplications(applicantUserId: string): Promise<any[]> {
    const applications = await this.applicationsRepository.find({
      where: { applicantUserId },
      order: { createdAt: 'DESC' },
    });
    if (applications.length === 0) return [];
    const postingIds = Array.from(new Set(applications.map((a) => a.jobPostingId)));
    const postings = await this.postingsRepository.find({
      where: postingIds.map((id) => ({ id })),
    });
    const postingById = new Map(postings.map((p) => [p.id, p]));
    const tradesByPosting = await this.loadTradeIds(postingIds);
    const acceptedPosterIds = applications
      .filter((a) => a.status === 'ACCEPTED')
      .map((a) => postingById.get(a.jobPostingId)?.posterId)
      .filter((v): v is string => Boolean(v));
    const posterContacts = await this.fetchContacts(acceptedPosterIds);
    return applications.map((a) => {
      const posting = postingById.get(a.jobPostingId);
      const posterContact =
        a.status === 'ACCEPTED' && posting ? posterContacts.get(posting.posterId) ?? null : null;
      return {
        ...a,
        posting: posting
          ? {
              id: posting.id,
              title: posting.title,
              status: posting.status,
              location: posting.location,
              city: posting.city,
              payOffer: posting.payOffer,
              payRateUnit: posting.payRateUnit,
              tradeCategoryIds: tradesByPosting.get(posting.id) ?? [],
            }
          : null,
        posterContact,
      };
    });
  }

  // ── Admin surface (fronted by AdminService) ──────────────────────────

  async listPendingPostings(): Promise<any[]> {
    const postings = await this.postingsRepository.find({
      where: { status: 'PENDING_APPROVAL' },
      order: { createdAt: 'ASC' },
    });
    if (postings.length === 0) return [];
    const [tradesByPosting, posters] = await Promise.all([
      this.loadTradeIds(postings.map((p) => p.id)),
      this.fetchContacts(postings.map((p) => p.posterId)),
    ]);
    return postings.map((p) => ({
      ...p,
      tradeCategoryIds: tradesByPosting.get(p.id) ?? [],
      poster: {
        userId: p.posterId,
        name: posters.get(p.posterId)?.name ?? 'Unknown user',
        role: posters.get(p.posterId)?.role ?? 'UNKNOWN',
      },
    }));
  }

  async approvePosting(id: string, adminId: string): Promise<JobPosting> {
    const posting = await this.postingsRepository.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.status === 'APPROVED') return posting; // idempotent replay
    if (posting.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Cannot approve a posting in status ${posting.status}`);
    }
    posting.status = 'APPROVED';
    posting.approvedByAdminId = adminId;
    posting.rejectionReason = null;
    const saved = await this.postingsRepository.save(posting);

    // Post-mutation fan-out, fire-and-forget (inquiries dispatch contract):
    // the poster learns it's live; every matched seeker gets the lead.
    void this.notifyPoster(saved, 'JOB_APPROVED', {
      title: `Job approved: ${saved.title}`,
      data: { jobPostingId: saved.id },
    });
    void this.dispatchJobMatchNotifications(saved).catch((e) =>
      this.logger.error(
        `NEW_JOB_MATCH dispatch failed for posting ${saved.id}: ${(e as Error).message}`,
      ),
    );
    return saved;
  }

  async rejectPosting(id: string, adminId: string, reason?: string): Promise<JobPosting> {
    const posting = await this.postingsRepository.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.status === 'REJECTED') return posting; // idempotent replay
    if (posting.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Cannot reject a posting in status ${posting.status}`);
    }
    posting.status = 'REJECTED';
    posting.rejectionReason = reason?.trim() || 'Did not meet posting guidelines';
    posting.approvedByAdminId = adminId;
    const saved = await this.postingsRepository.save(posting);
    void this.notifyPoster(saved, 'JOB_REJECTED', {
      title: `Job needs changes: ${saved.title}`,
      data: { jobPostingId: saved.id, rejectionReason: saved.rejectionReason },
    });
    return saved;
  }

  // ── Internals ────────────────────────────────────────────────────────

  /**
   * The documents a posting demands, each of which an application MUST carry
   * an attachment for (matched on the exact label string).
   *
   * MUST mirror getRequiredAttachmentSlots in
   * src/services/labourFormSchema.ts — the apply modal blocks submit on that
   * copy, so any drift here either rejects applications the applicant was
   * told were complete, or silently accepts ones missing a demanded document.
   */
  private getRequiredAttachmentSlots(
    attributes: Record<string, any> | null | undefined,
  ): string[] {
    const docs: string[] = Array.isArray(attributes?.req_documents)
      ? attributes!.req_documents
      : [];
    // 'Application Letter' leads every list: an application is a letter plus
    // evidence, whatever the posting demands beyond it. The Set dedupes a
    // poster who listed a document by the same name.
    return Array.from(
      new Set([
        'Application Letter',
        ...docs,
        ...(attributes?.req_certifications ? ['Certification'] : []),
      ]),
    );
  }

  /** Every id must be an existing, admin-enabled child of `labour` —
   *  machinery-hire (and anything else) is rejected here, keeping the
   *  job board a labour-trades-only surface. */
  private async assertLabourTrades(tradeCategoryIds: string[]): Promise<void> {
    const rows: Array<{ id: string; parentId: string | null }> = await this.dataSource.query(
      `SELECT id, "parentId" FROM categories WHERE id = ANY($1)`,
      [tradeCategoryIds],
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    const invalid = tradeCategoryIds.filter((id) => byId.get(id)?.parentId !== 'labour');
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Not valid labour trade categories: ${invalid.join(', ')}`,
      );
    }
    const disabled = await this.categoriesService.getEffectiveDisabledIds();
    const blocked = tradeCategoryIds.filter((id) => disabled.has(id));
    if (blocked.length > 0) {
      throw new BadRequestException(
        `The following categories are not currently available: ${blocked.join(', ')}`,
      );
    }
  }

  private async transitionOwnPosting(
    id: string,
    posterId: string,
    fromStatuses: JobPosting['status'][],
    to: JobPosting['status'],
  ): Promise<JobPosting> {
    const posting = await this.postingsRepository.findOne({ where: { id } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.posterId !== posterId) {
      throw new ForbiddenException('Only the poster can update this posting');
    }
    if (posting.status === to) return posting; // idempotent replay
    if (!fromStatuses.includes(posting.status)) {
      throw new ConflictException(`Cannot move a ${posting.status} posting to ${to}`);
    }
    posting.status = to;
    return this.postingsRepository.save(posting);
  }

  private async respondToApplication(
    applicationId: string,
    posterId: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<any> {
    const application = await this.applicationsRepository.findOne({
      where: { id: applicationId },
      relations: ['jobPosting'],
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.jobPosting.posterId !== posterId) {
      throw new ForbiddenException('Only the poster can respond to applications');
    }
    if (application.status === status) return application; // idempotent replay
    if (application.status !== 'PENDING') {
      throw new ConflictException(`Application already ${application.status.toLowerCase()}`);
    }
    application.status = status;
    application.respondedAt = new Date();
    const saved = await this.applicationsRepository.save(application);

    const posting = application.jobPosting;
    void this.safeNotify(
      [application.applicantUserId],
      status === 'ACCEPTED' ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
      () => ({
        title:
          status === 'ACCEPTED'
            ? `You got the job: ${posting.title}`
            : `Application update: ${posting.title}`,
        data: { jobPostingId: posting.id, applicationId: saved.id, status },
      }),
    );
    return saved;
  }

  /** Every employment account, minus the poster themself (a user can hold
   *  both sides). Matches the feed: if a job is visible to all jobseekers,
   *  the "new job" alert has to reach the same audience, or the notification
   *  and the board would disagree about who the job is for. */
  private async dispatchJobMatchNotifications(posting: JobPosting): Promise<void> {
    const rows: Array<{ userId: string }> = await this.dataSource.query(
      `SELECT DISTINCT pp."userId"
         FROM service_provider_profiles pp
        WHERE ${EMPLOYMENT_ACCOUNT_PREDICATE}`,
    );
    const audience = rows.map((r) => r.userId).filter((id) => id !== posting.posterId);
    if (audience.length === 0) return;
    const trades = (await this.loadTradeIds([posting.id])).get(posting.id) ?? [];
    await this.notificationsService.notifyUsers(audience, 'NEW_JOB_MATCH', () => ({
      title: posting.title,
      data: {
        jobPostingId: posting.id,
        title: posting.title,
        location: posting.location,
        city: posting.city,
        payOffer: posting.payOffer,
        payRateUnit: posting.payRateUnit,
        workersNeeded: posting.workersNeeded,
        tradeCategoryIds: trades,
        createdAt: posting.createdAt,
      },
    }));
  }

  /** Poster-facing notify with the role-correct dashboard route (buyers
   *  and sellers open My Job Posts in different shells). */
  private async notifyPoster(
    posting: JobPosting,
    type: 'JOB_APPROVED' | 'JOB_REJECTED' | 'NEW_JOB_APPLICATION',
    payload: { title: string; data?: Record<string, any> },
  ): Promise<void> {
    try {
      const contacts = await this.fetchContacts([posting.posterId]);
      const role = contacts.get(posting.posterId)?.role;
      const route = role === 'BUYER' ? '/buyer/my-job-posts' : '/provider/my-job-posts';
      await this.notificationsService.notifyUsers([posting.posterId], type, () => ({
        ...payload,
        route,
      }));
    } catch (e) {
      this.logger.error(
        `${type} notify failed for posting ${posting.id}: ${(e as Error).message}`,
      );
    }
  }

  private async safeNotify(
    userIds: string[],
    type: 'APPLICATION_ACCEPTED' | 'APPLICATION_REJECTED',
    build: () => { title: string; data?: Record<string, any> },
  ): Promise<void> {
    try {
      await this.notificationsService.notifyUsers(userIds, type, build);
    } catch (e) {
      this.logger.error(`${type} notify failed: ${(e as Error).message}`);
    }
  }

  private async loadTradeIds(postingIds: string[]): Promise<Map<string, string[]>> {
    if (postingIds.length === 0) return new Map();
    const rows = await this.postingCategoriesRepository.find({
      where: postingIds.map((jobPostingId) => ({ jobPostingId })),
    });
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.jobPostingId) ?? [];
      list.push(row.categoryId);
      map.set(row.jobPostingId, list);
    }
    return map;
  }

  /**
   * Applicant identity for the poster's applicant cards — pulled from the
   * provider's service_provider_profiles row (SKILLED_LABOUR preferred when
   * a user holds several). Contact fields are returned here but only pass
   * the API boundary once the caller's status gate says ACCEPTED.
   */
  private async fetchApplicantProfiles(userIds: string[]): Promise<
    Map<
      string,
      {
        name: string | null;
        phone: string | null;
        email: string | null;
        city: string | null;
        profilePicture: string | null;
        trades: string[];
      }
    >
  > {
    const unique = Array.from(new Set(userIds));
    if (unique.length === 0) return new Map();
    const rows: Array<{
      userId: string;
      name: string | null;
      phone: string | null;
      email: string | null;
      city: string | null;
      profilePicture: string | null;
      labourSubTypes: string | null;
    }> = await this.dataSource.query(
      `SELECT DISTINCT ON ("userId")
              "userId", name, phone, email, city, "profilePicture", "labourSubTypes"
         FROM service_provider_profiles
        WHERE "userId" = ANY($1)
        ORDER BY "userId", (CASE WHEN "subRole" = 'SKILLED_LABOUR' THEN 0 ELSE 1 END)`,
      [unique],
    );
    return new Map(
      rows.map((r) => [
        r.userId,
        {
          name: r.name,
          phone: r.phone,
          email: r.email,
          city: r.city,
          profilePicture: r.profilePicture,
          trades: String(r.labourSubTypes ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      ]),
    );
  }

  /**
   * Cross-role identity/contact lookup: name + role (+ phone/email) for any
   * users.id, whatever profile shape they hold. Preference order per user:
   * the profile matching users.activeProfileType, then seller → service
   * provider → buyer, then users.name (the ADMIN carve-out).
   */
  private async fetchContacts(userIds: string[]): Promise<Map<string, JobBoardContact>> {
    const unique = Array.from(new Set(userIds)).filter(Boolean);
    if (unique.length === 0) return new Map();
    const [users, sellers, providers, buyers] = await Promise.all([
      this.dataSource.query(
        `SELECT id, role, name, "activeProfileType" FROM users WHERE id = ANY($1)`,
        [unique],
      ) as Promise<Array<{ id: string; role: string; name: string | null; activeProfileType: string | null }>>,
      this.dataSource.query(
        `SELECT DISTINCT ON ("userId") "userId", name, phone, email
           FROM seller_profiles WHERE "userId" = ANY($1) ORDER BY "userId", "createdAt"`,
        [unique],
      ) as Promise<Array<{ userId: string; name: string | null; phone: string | null; email: string | null }>>,
      this.dataSource.query(
        `SELECT DISTINCT ON ("userId") "userId", name, phone, email
           FROM service_provider_profiles WHERE "userId" = ANY($1) ORDER BY "userId", "createdAt"`,
        [unique],
      ) as Promise<Array<{ userId: string; name: string | null; phone: string | null; email: string | null }>>,
      this.dataSource.query(
        `SELECT DISTINCT ON ("userId") "userId", name, phone, email
           FROM buyer_profiles WHERE "userId" = ANY($1) ORDER BY "userId", "createdAt"`,
        [unique],
      ) as Promise<Array<{ userId: string; name: string | null; phone: string | null; email: string | null }>>,
    ]);
    const sellerBy = new Map(sellers.map((r) => [r.userId, r]));
    const providerBy = new Map(providers.map((r) => [r.userId, r]));
    const buyerBy = new Map(buyers.map((r) => [r.userId, r]));
    const map = new Map<string, JobBoardContact>();
    for (const u of users) {
      const byType: Record<string, { name: string | null; phone: string | null; email: string | null } | undefined> = {
        SELLER: sellerBy.get(u.id),
        SERVICE_PROVIDER: providerBy.get(u.id),
        BUYER: buyerBy.get(u.id),
      };
      const active = u.activeProfileType ? byType[u.activeProfileType] : undefined;
      const profile =
        active ?? sellerBy.get(u.id) ?? providerBy.get(u.id) ?? buyerBy.get(u.id) ?? null;
      map.set(u.id, {
        userId: u.id,
        name: profile?.name ?? u.name ?? null,
        role: u.role,
        phone: profile?.phone ?? null,
        email: profile?.email ?? null,
      });
    }
    return map;
  }
}
