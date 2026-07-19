import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quote } from '../../quotes/entities/quote.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Before/after service evidence captured on a job (= a paid quote).
 *
 * Rows are written by the assigned technician (or the owner) and read by the
 * owner, the assigned technician, the quote's buyer, and admins — see
 * JobsService for the authorization matrix. `url` points at a file uploaded
 * through POST /files/upload?category=job-evidence (public /uploads, images
 * and short videos).
 *
 * CASCADE on the quote FK is deliberate (unlike Quote→Inquiry which is
 * RESTRICT to protect escrow): evidence is metadata about a job, not a money
 * record, so it should follow its quote out rather than orphan.
 */
@Entity('job_media')
@Index('idx_job_media_quote_id', ['quoteId'])
export class JobMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  quoteId: string;

  @ManyToOne(() => Quote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quoteId' })
  quote: Quote;

  @Column({ type: 'uuid' })
  capturedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'capturedById' })
  capturedBy: User;

  @Column({ type: 'enum', enum: ['BEFORE', 'AFTER'] })
  phase: string;

  @Column({ type: 'enum', enum: ['IMAGE', 'VIDEO'] })
  mediaType: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
