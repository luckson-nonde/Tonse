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
 * ServiceProviderProfile — Phase 3 of the users-table restructure.
 *
 * Covers anything customers BOOK rather than buy: repair shops, event
 * venues, equipment rental, catering, decor, planning, photography, DJs,
 * bands, MCs, dancers, comedians, performers, AND skilled labour
 * (carpenters, welders, plumbers, etc.). Per the Phase 2 taxonomy fix,
 * none of these transfer ownership of goods, so they're not sellers.
 *
 * The shape closely mirrors SellerProfile because both can be
 * verified businesses (PACRA, TPIN) with a service-area location, but
 * service_provider also carries labour-specific fields and uses different
 * subRole values.
 *
 * userId FK is NOT unique — supports role-switching (a single user
 * row can have a seller_profiles AND a service_provider_profiles row,
 * with users.activeProfileId pointing at whichever is current).
 */
@Entity('service_provider_profiles')
@Index('idx_service_provider_profiles_user', ['userId'])
@Index('idx_service_provider_profiles_verification', ['verificationStatus'])
export class ServiceProviderProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** INDIVIDUAL_PROVIDER / AGENCY_PROVIDER / SKILLED_LABOUR */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subRole: string;

  /** Categories of services offered (with variant suffixes for repair). */
  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  // ===== Labour-specific (only populated when subRole = SKILLED_LABOUR) =====

  @Column({ type: 'varchar', length: 50, nullable: true })
  labourCategory: string;

  @Column({ type: 'simple-array', default: '' })
  labourSubTypes: string[];

  // ===== Business identity (optional for solo practitioners; required
  // when registering as an Agency or formal Skilled Labour business). =====

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

  // ===== Service-area location (where the provider operates). =====

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
