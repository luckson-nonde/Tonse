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
import { User } from './user.entity';

/**
 * BuyerProfile — Phase 3 of the users-table restructure.
 *
 * The contract: users holds auth/identity only. Everything else (the
 * "proffer" of the user — who they are when wearing this role) lives
 * on profiles. A buyer's profile carries their display name, contact
 * info, delivery location, and the categories they typically source.
 *
 * userId FK is NOT unique — supports future role-switching (a single
 * user can carry both a buyer_profiles row and a seller_profiles row;
 * users.activeProfileId points at whichever is current).
 */
@Entity('buyer_profiles')
@Index('idx_buyer_profiles_user', ['userId'])
@Index('idx_buyer_profiles_verification', ['verificationStatus'])
export class BuyerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // ===== Identity-on-this-profile =====

  /** Display name on this profile (a person may keep a personal name as
   *  buyer and a business brand name on a seller profile). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ type: 'text', nullable: true })
  profilePicture: string;

  @Column({ type: 'text', nullable: true })
  socialLinks: string;

  // ===== Sub-shape =====

  /** INDIVIDUAL_BUYER / COMPANY_BUYER / COMPANY_PROCUREMENT_OFFICER /
   *  COMPANY_SECRETARY / COMPANY_RECEPTIONIST / COMPANY_MANAGER */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subRole: string;

  // ===== Delivery / preferred-area location =====

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  radius: number;

  /** Buyer interest categories — what they typically source. */
  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  // ===== Verification (uniform shape across all profiles) =====

  @Column({
    type: 'enum',
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'INCOMPLETE'],
    default: 'PENDING',
  })
  verificationStatus: string;

  @Column({ type: 'text', nullable: true })
  verificationRejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
