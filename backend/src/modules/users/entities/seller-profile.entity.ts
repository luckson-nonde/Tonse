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
import { piiTransformer } from '../../../common/crypto/pii-crypto';

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

  /**
   * Business/shop logo — the brand mark on marketplace directory cards
   * (GET /shops). Distinct from profilePicture, which is the OWNER'S
   * photo and belongs on the shop profile page. Submitted from the
   * account-settings "Shop / Business Logo" upload.
   */
  @Column({ type: 'text', nullable: true })
  logo: string;

  /**
   * Shop image / cover — the circular showcase photo on directory cards.
   * When unset, GET /shops falls back to the seller's newest product image.
   */
  @Column({ type: 'text', nullable: true })
  coverImage: string;

  @Column({ type: 'text', nullable: true })
  socialLinks: string;

  // ===== Sub-shape =====

  /** PRODUCT_SELLER. (HYBRID_SELLER and SUPPLIER_SELLER retired —
   * "wholesale" and "products + services" are now expressed via the
   * archetype set on `seller_profile_archetypes`, not the auth-level
   * sub-role.) */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subRole: string;

  // Phase 1 of multi-archetype: the previous `archetype` enum column
  // collapsed mixed-variant sellers to a single dashboard surface. The
  // archetype set now lives in `seller_profile_archetypes` (composite-
  // PK junction), which lets a seller declare both RETAIL and REPAIR
  // simultaneously. ArchetypeResolverService recomputes that set on
  // every category junction write, in the same transaction.

  // ===== Business identity (PACRA / ZRA registration) =====

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  // Widened to `text` + encrypted at rest (see pii-crypto). Not a search key.
  @Column({ type: 'text', nullable: true, transformer: piiTransformer })
  tpin: string;

  // PACRA certificate (base64 data URL) — encrypted at rest.
  @Column({ type: 'text', nullable: true, transformer: piiTransformer })
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

  /**
   * 4-digit security PIN — gates this profile's financial surface.
   * Lives on the profile (not the auth row) so a user can carry a
   * different PIN per profile when role-switching. select:false +
   * @Exclude keep it out of API responses.
   */
  @Column({ type: 'varchar', length: 4, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  pin: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
