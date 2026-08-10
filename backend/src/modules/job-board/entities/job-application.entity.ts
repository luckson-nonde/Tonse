import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobPosting } from './job-posting.entity';

export type JobApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/**
 * A job seeker's application to a posting. Applicant-shaped, not
 * quote-shaped: a cover message + expected rate + availability, no line
 * items or escrow. Accepting one does NOT auto-reject the others — a
 * posting with workersNeeded > 1 legitimately accepts several.
 *
 * Contact details are NEVER stored here; both sides' phone/email are
 * resolved live from profile rows and only revealed once status is
 * ACCEPTED (gating lives in JobBoardService, not the client).
 */
@Entity('job_applications')
@Index('idx_job_applications_posting', ['jobPostingId'])
@Index('idx_job_applications_applicant', ['applicantUserId'])
@Index('idx_job_applications_unique', ['jobPostingId', 'applicantUserId'], { unique: true })
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  jobPostingId: string;

  @ManyToOne(() => JobPosting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobPostingId' })
  jobPosting: JobPosting;

  /** users.id of the labour provider applying. Loose uuid, no FK. */
  @Column({ type: 'uuid' })
  applicantUserId: string;

  @Column({ type: 'text' })
  coverMessage: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  expectedRate: number;

  @Column({ type: 'varchar', length: 20 })
  rateUnit: string;

  @Column({ type: 'date' })
  availabilityDate: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING',
  })
  status: JobApplicationStatus;

  /** When the poster accepted/rejected. NULL while PENDING. */
  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
