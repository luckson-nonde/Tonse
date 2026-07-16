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
import { User } from '../../users/entities/user.entity';

/**
 * A promoter's unique referral code — one row per PROMOTER account,
 * created in the same transaction as the account itself (auto-provisioned,
 * no admin step).
 *
 * PROMOTER users carry no profile row (they're auth-identity only, like
 * ADMIN), so the promoter's human-facing fields (name/email/phone) are
 * denormalized here instead of inventing a promoter_profiles table for
 * three columns.
 */
@Entity('referral_links')
@Index('idx_referral_links_code', ['code'], { unique: true })
@Index('idx_referral_links_promoter', ['promoterUserId'], { unique: true })
export class ReferralLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The PROMOTER user this link belongs to (1:1). */
  @Column({ type: 'uuid' })
  promoterUserId: string;

  // Entity-only relation — never import UsersModule here (referrals is
  // imported BY users for registration capture; the reverse would cycle).
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoterUserId' })
  promoter: User;

  /** Shareable URL-safe code, e.g. REF-8FQ2M3K7 (ReferralCodeUtil). */
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  /** Denormalized promoter identity (no profile row exists for PROMOTER). */
  @Column({ type: 'varchar', length: 255 })
  promoterName: string;

  @Column({ type: 'varchar', length: 255 })
  promoterEmail: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  promoterPhone: string | null;

  /** Kill-switch: inactive codes stop capturing NEW conversions. */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
