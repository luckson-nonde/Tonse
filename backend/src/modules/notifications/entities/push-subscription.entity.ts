import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * A single browser/device Web Push subscription for a user.
 *
 * One row per (user, device). `endpoint` is the push-service URL and is
 * globally unique per subscription — we upsert on it so re-subscribing the
 * same device is idempotent. Rows are self-healed (deleted) by PushService
 * when the push service returns 404/410 (expired), and cascade-deleted with
 * the user.
 */
@Entity('push_subscriptions')
@Index('idx_push_subscriptions_user', ['userId'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', unique: true })
  endpoint: string;

  /** Client public key for payload encryption (from PushSubscription.keys). */
  @Column({ type: 'varchar' })
  p256dh: string;

  /** Client auth secret (from PushSubscription.keys). */
  @Column({ type: 'varchar' })
  auth: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
