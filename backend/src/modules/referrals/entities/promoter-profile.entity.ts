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

/** One social platform the artist runs — { platform: 'instagram', url, handle? }. */
export interface SocialLink {
  platform: string;
  url: string;
  handle?: string;
}

/**
 * Promoter identity profile — 1:1 with the PROMOTER user.
 *
 * Captured AT SIGNUP (the invite key alone proves possession of the NDA
 * packet, not identity): bio, the social platforms they run, an ID
 * document, and a LIVE selfie so an admin can match the face to the
 * document before trusting the referral pipeline. verificationStatus
 * follows the same PENDING → VERIFIED / REJECTED lifecycle as the other
 * profile tables; identity-field edits drop it back to PENDING.
 *
 * selfiePath / idDocumentPath hold base64 data URLs (same convention as
 * users.nrcDocumentPath) — admin review reads them via the dedicated
 * GET /admin/promoters/:id, they're never bulk-listed.
 */
@Entity('promoter_profiles')
@Index('idx_promoter_profiles_user', ['userId'], { unique: true })
@Index('idx_promoter_profiles_verification', ['verificationStatus'])
export class PromoterProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Artist bio / who they are. */
  @Column({ type: 'text', nullable: true })
  bio: string | null;

  /** Platforms the artist runs — at least one required at signup. */
  @Column({ type: 'json', nullable: true })
  socialLinks: SocialLink[] | null;

  /**
   * Live selfie (base64 data URL) — identity proof at registration.
   * select:false — a KYC identity photo must never ride along on a
   * default find()/findOne() read. PromotersService.getMe() (the one
   * legitimate consumer — a promoter viewing their own submission)
   * explicitly re-selects it via a query builder.
   */
  @Column({ type: 'text', nullable: true, select: false })
  selfiePath: string | null;

  /** ID document photo/scan (base64 data URL). Same select:false rationale. */
  @Column({ type: 'text', nullable: true, select: false })
  idDocumentPath: string | null;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING',
  })
  verificationStatus: string;

  /** Admin-entered reason shown to the promoter on rejection. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
