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
import { Exclude } from 'class-transformer';
import { User } from './user.entity';

/**
 * ServiceProviderProfile — Phase 3 of the users-table restructure.
 *
 * Covers anything customers BOOK rather than buy: repair shops, event
 * venues, equipment rental, catering, decor, planning, photography, DJs,
 * bands, MCs, dancers, comedians, performers, AND skilled labour
 * (carpenters, welders, plumbers). Per the Phase 2 taxonomy fix, none
 * of these transfer ownership of goods, so they're not sellers.
 *
 * Mirrors SellerProfile's shape (both can be verified businesses with
 * a service-area location) plus labour-specific fields. userId FK is
 * NOT unique — supports future role-switching.
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

  // ===== Identity-on-this-profile =====

  /** Display name — for solo practitioners often the person's name; for
   *  agencies the brand / business name. */
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

  /** INDIVIDUAL_PROVIDER / AGENCY_PROVIDER / SKILLED_LABOUR */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subRole: string;

  /**
   * Cached archetype — see seller-profile.entity for the contract.
   * Recomputed on every junction write by ArchetypeResolver.
   */
  @Column({
    type: 'enum',
    enum: ['RETAIL', 'RENTAL', 'BOOKING', 'LABOUR', 'REPAIR', 'SERVICE', 'EVENTS', 'ENTERTAINMENT'],
    nullable: true,
  })
  archetype: string;

  // ===== Labour-specific (only populated when subRole = SKILLED_LABOUR) =====

  @Column({ type: 'varchar', length: 50, nullable: true })
  labourCategory: string;

  @Column({ type: 'simple-array', default: '' })
  labourSubTypes: string[];

  // ===== Business identity (optional for solo; required for Agency / formal
  // skilled-labour business). =====

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

  // ===== Service-area location (where the provider operates) =====

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

  /**
   * 4-digit security PIN — gates this profile's financial surface.
   * Lives on the profile (not the auth row). select:false + @Exclude
   * keep it out of API responses.
   */
  @Column({ type: 'varchar', length: 4, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  pin: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
