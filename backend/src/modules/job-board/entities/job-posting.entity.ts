import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type JobPostingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'FILLED'
  | 'CLOSED';

export const JOB_RATE_UNITS = ['Per Hour', 'Per Day', 'Per Week', 'Per Month'] as const;
export type JobRateUnit = (typeof JOB_RATE_UNITS)[number];

/**
 * A job posting on the labour job board. NOT an inquiry: postings are
 * moderated (deny-until-approved, like ads), free to create, and answered
 * with applications rather than price quotes. The trade categories a
 * posting targets live in `job_posting_categories` (junction, never an
 * array column — repo invariant), and only labour-registered providers
 * whose subscribed trades intersect them see it in their feed.
 *
 * Lifecycle: [PENDING_PAYMENT →] PENDING_APPROVAL → APPROVED (admin) →
 * FILLED/CLOSED (poster), or PENDING_APPROVAL → REJECTED (admin) → back to
 * PENDING_APPROVAL via the poster's edit-and-resubmit path (no re-charge —
 * the fee was paid on the way in). PENDING_PAYMENT only occurs while the
 * admin's job-posting fee switch is ON (billing_settings.jobPostingFeeEnabled);
 * `feeAmount` snapshots the price charged at creation, ads-style.
 */
@Entity('job_postings')
@Index('idx_job_postings_poster', ['posterId'])
@Index('idx_job_postings_status', ['status'])
@Index('idx_job_postings_created', ['createdAt'])
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** users.id of whoever posted — buyer, seller, or provider alike.
   *  Loose uuid, no FK relation (care-plans convention). */
  @Column({ type: 'uuid' })
  posterId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'integer', nullable: true })
  workersNeeded: number | null;

  /** Optional advertised pay. When set, payRateUnit qualifies it. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  payOffer: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  payRateUnit: string | null;

  /** After this instant the posting stops accepting applications and
   *  drops out of seeker feeds. NULL = open until filled/closed. */
  @Column({ type: 'timestamp', nullable: true })
  applicationDeadline: Date | null;

  // Location snapshot — same shape/meaning as on Inquiry. Geo columns are
  // stored but unused by matching v1 (trade-category match only).
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  /** Per-trade form answers (workers count, start date, tools provided, …)
   *  plus the urgency/preferredDateTime pair. JS-filtered after load, never
   *  queried in SQL (repo invariant on json columns). */
  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FILLED', 'CLOSED'],
    default: 'PENDING_APPROVAL',
  })
  status: JobPostingStatus;

  /** The posting fee charged at creation (ZMW), NULL when posting was free.
   *  A snapshot, never re-read from settings — the price the poster saw. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  feeAmount: number | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedByAdminId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
