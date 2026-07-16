import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Promoter programme settings — effectively a single row (get-or-create).
 *
 * Holds the admin-managed invite key that gates POST /promoter/signup.
 * Stored in PLAINTEXT deliberately: it's a shared distribution secret the
 * admin must be able to read back and hand to NDA'd artists — not a
 * credential to verify-only like a password. Rotating it invalidates the
 * old key instantly. The PROMOTER_INVITE_KEY env var remains a fallback
 * for boots where no row exists yet.
 */
@Entity('promoter_settings')
export class PromoterSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  inviteKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
