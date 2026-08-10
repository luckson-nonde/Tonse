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

/** Postgres unique-violation SQLSTATE — the double-apply guard's error. */
const PG_UNIQUE_VIOLATION = '23505';

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
  ) {}

  // ── Poster surface ───────────────────────────────────────────────────

  async createPosting(posterId: string, dto: CreateJobPostingDto): Promise<any> {
    const { tradeCategoryIds, applicationDeadline, ...rest } = dto;
    const uniqueTradeIds = Array.from(new Set(tradeCategoryIds));
    await this.assertLabourTrades(uniqueTradeIds);

    const saved = await this.dataSource.transaction(async (manager) => {
      const postingRepo = manager.getRepository(JobPosting);
      const junctionRepo = manager.getRepository(JobPostingCategory);
      const posting = await postingRepo.save(
        postingRepo.create({
          ...rest,
          posterId,
          applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
          status: 'PENDING_APPROVAL',
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

  async acceptApplication(applicationId: string, posterId: string): Promise<any> {
    return this.respondToApplication(applicationId, posterId, 'ACCEPTED');
  }

  async rejectApplication(applicationId: string, posterId: string): Promise<any> {
    return this.respondToApplication(applicationId, posterId, 'REJECTED');
  }

  // ── Seeker surface ───────────────────────────────────────────────────

  /**
   * Approved, still-open postings whose trades intersect the seeker's
   * registered trade categories. Plain equality join — labour trades are
   * flat leaves under `labour`, so no tree expansion is needed. A seeker
   * with zero registered trades simply gets an empty feed.
   */
  async listFeedForSeeker(userId: string): Promise<any[]> {
    // Dedup via IN-subquery, not SELECT DISTINCT — `attributes` is a json
    // column and Postgres has no equality operator for json, so DISTINCT
    // over jp.* 500s.
    const rows: JobPosting[] = await this.dataSource.query(
      `SELECT jp.*
         FROM job_postings jp
        WHERE jp.id IN (
                SELECT jpc."jobPostingId"
                  FROM job_posting_categories jpc
                  JOIN service_provider_profile_categories spc ON spc."categoryId" = jpc."categoryId"
                  JOIN service_provider_profiles pp ON pp.id = spc."serviceProviderProfileId"
                 WHERE pp."userId" = $1
              )
          AND jp.status = 'APPROVED'
          AND jp."posterId" <> $1
          AND (jp."applicationDeadline" IS NULL OR jp."applicationDeadline" > NOW())
        ORDER BY jp."createdAt" DESC`,
      [userId],
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [tradesByPosting, myApplications, posterContacts] = await Promise.all([
      this.loadTradeIds(ids),
      this.applicationsRepository.find({
        where: { applicantUserId: userId },
        select: ['jobPostingId', 'status'],
      }),
      this.fetchContacts(rows.map((r) => r.posterId)),
    ]);
    const myAppByPosting = new Map(myApplications.map((a) => [a.jobPostingId, a.status]));
    return rows.map((p) => ({
      ...p,
      tradeCategoryIds: tradesByPosting.get(p.id) ?? [],
      posterName: posterContacts.get(p.posterId)?.name ?? 'Nyuwe member',
      hasApplied: myAppByPosting.has(p.id),
      myApplicationStatus: myAppByPosting.get(p.id) ?? null,
    }));
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
    const eligible: Array<{ ok: number }> = await this.dataSource.query(
      `SELECT 1 AS ok
         FROM service_provider_profile_categories spc
         JOIN service_provider_profiles pp ON pp.id = spc."serviceProviderProfileId"
         JOIN job_posting_categories jpc ON jpc."categoryId" = spc."categoryId"
        WHERE pp."userId" = $1 AND jpc."jobPostingId" = $2
        LIMIT 1`,
      [applicantUserId, jobPostingId],
    );
    if (eligible.length === 0) {
      throw new ForbiddenException(
        'Only providers registered for this job\'s trade can apply',
      );
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

  /** All labour providers whose registered trades intersect the posting's,
   *  minus the poster themself (a user can hold both sides). */
  private async dispatchJobMatchNotifications(posting: JobPosting): Promise<void> {
    const rows: Array<{ userId: string }> = await this.dataSource.query(
      `SELECT DISTINCT pp."userId"
         FROM service_provider_profile_categories spc
         JOIN service_provider_profiles pp ON pp.id = spc."serviceProviderProfileId"
         JOIN job_posting_categories jpc ON jpc."categoryId" = spc."categoryId"
        WHERE jpc."jobPostingId" = $1`,
      [posting.id],
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
