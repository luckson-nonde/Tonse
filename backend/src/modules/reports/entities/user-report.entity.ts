import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A user-submitted complaint against another user (buyer reports a shop,
 * seller reports a buyer, etc.). Reviewed by admins holding the
 * ADMIN_REPORTS permission (the "User Manager" role) via /admin/reports.
 *
 * Loose uuid columns, no FK relations — same convention as audit_logs, so
 * a report survives the deletion of either party's account.
 */
@Entity('user_reports')
@Index('idx_user_reports_reporter', ['reporterId'])
@Index('idx_user_reports_reported', ['reportedUserId'])
@Index('idx_user_reports_status', ['status'])
@Index('idx_user_reports_created_at', ['createdAt'])
export class UserReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reporterId: string;

  @Column({ type: 'uuid' })
  reportedUserId: string;

  @Column({
    type: 'enum',
    enum: [
      'SCAM_FRAUD',
      'ABUSIVE_BEHAVIOR',
      'NO_SHOW',
      'FAKE_LISTING',
      'PAYMENT_DISPUTE',
      'OTHER',
    ],
  })
  category: string;

  @Column({ type: 'text' })
  description: string;

  /** Optional context the report was filed from (the lead card, a quote…). */
  @Column({ type: 'enum', enum: ['INQUIRY', 'QUOTE', 'ORDER'], nullable: true })
  contextType: string | null;

  @Column({ type: 'uuid', nullable: true })
  contextId: string | null;

  @Column({ type: 'enum', enum: ['OPEN', 'RESOLVED', 'DISMISSED'], default: 'OPEN' })
  status: string;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedByAdminId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
