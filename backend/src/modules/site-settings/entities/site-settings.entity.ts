import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Platform-wide site settings — effectively a single row (get-or-create),
 * same pattern as BillingSettings. Admin-edited from the "Landing Page" tab.
 *
 * `landingPageEnabled` controls whether unauthenticated visitors see the
 * public /discover shop directory at "/" instead of being sent straight to
 * /login. Defaults to false so a fresh deploy never changes today's
 * straight-to-login behaviour until an admin deliberately opts in.
 */
@Entity('site_settings')
export class SiteSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: false })
  landingPageEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
