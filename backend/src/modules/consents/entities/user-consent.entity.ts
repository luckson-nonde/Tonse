import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Append-only record of a user's consent decisions, so consent is
 * DEMONSTRABLE under the Data Protection Act 2021 (who consented to what,
 * which version of the notice, and when). Each grant OR withdrawal is a new
 * row; the latest row per (userId, noticeKey) is the current state.
 *
 * noticeKey values (see docs/legal/CONSENT_NOTICES.md):
 *   identity_nrc · location_gps · share_contact_txn · offplatform_handoff · marketing_comms
 */
@Entity('user_consents')
@Index('idx_user_consents_user', ['userId'])
@Index('idx_user_consents_user_notice', ['userId', 'noticeKey'])
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  noticeKey: string;

  /** Version of the notice text the user saw (bump to re-prompt). */
  @Column({ type: 'varchar', length: 20, default: '1' })
  version: string;

  /** true = granted, false = withdrawn/declined. */
  @Column({ type: 'boolean', default: true })
  granted: boolean;

  /** How it was captured, e.g. 'registration', 'settings', 'txn:<id>'. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  method: string;

  @CreateDateColumn()
  createdAt: Date;
}
