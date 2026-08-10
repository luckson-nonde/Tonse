import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { JobPosting } from './job-posting.entity';
import { Category } from '../../categories/entities/category.entity';

/**
 * Junction row between a job posting and a labour trade category it
 * targets. Composite PK so (jobPostingId, categoryId) is naturally
 * unique — exact mirror of inquiry_categories. Seeker-feed matching is
 * an equality join from here to service_provider_profile_categories.
 */
@Entity('job_posting_categories')
@Index('idx_job_posting_categories_category', ['categoryId'])
export class JobPostingCategory {
  @PrimaryColumn({ type: 'uuid' })
  jobPostingId: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  categoryId: string;

  @ManyToOne(() => JobPosting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobPostingId' })
  jobPosting: JobPosting;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
