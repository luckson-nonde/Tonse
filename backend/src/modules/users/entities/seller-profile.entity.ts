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
 * Holds the goods-seller-specific data that used to live on users:
 * business identity (companyName, tpin, PACRA cert), what they sell
 * (categories), business location, verification audit fields.
 *
 * userId FK is NOT unique — supports future role-switching (a user can
 * carry both seller_profiles and service_provider_profiles rows; the
 * active one is pointed at by users.activeProfileId).
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

  // ===== Verification (audit fields) =====

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

  // ===== Business location (the shop's address — distinct from a buyer's
  // delivery address that lives on buyer_profiles). =====

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
