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
 * SellerProfile — Phase 3 of the users-table restructure.
 *
 * Holds everything a goods-seller needs as a "profile": display name,
 * contact info, business identity (PACRA, ZRA), location, categories,
 * verification audit. users carries only auth/identity.
 *
 * userId FK is NOT unique — supports future role-switching.
 */
@Entity('seller_profiles')
@Index('idx_seller_profiles_user', ['userId'])
@Index('idx_seller_profiles_verification', ['verificationStatus'])
export class SellerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // ===== Identity-on-this-profile =====

  /** Display name (often the brand / shop name). */
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

  /** PRODUCT_SELLER / HYBRID_SELLER / SUPPLIER_SELLER */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subRole: string;

  /** Categories of goods sold (with variant suffixes like "(Buy New)"). */
  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  // ===== Business identity (PACRA / ZRA registration) =====

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tpin: string;

  @Column({ type: 'text', nullable: true })
  incorporationCertUrl: string;

  @Column({ type: 'uuid', nullable: true })
  businessLicenseId: string;

  // ===== Verification audit =====

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

  // ===== Business location (the shop's address) =====

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
