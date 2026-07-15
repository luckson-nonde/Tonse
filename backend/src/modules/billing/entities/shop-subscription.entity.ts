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
 * Monthly shop subscription — one row per shop OWNER.
 *
 * `userId` is always the owner's user.id (`parentProviderId ?? user.id`),
 * so staff accounts inherit — and may pay for — the owner's subscription.
 * `paidUntil` null or in the past = not paying: SubscriptionPaywall blocks
 * the dashboard while billing_settings.subscriptionsEnabled is true.
 * Each payment extends from max(now, paidUntil) by 30 days and writes a
 * `payments` ledger row (metadata.kind = 'SHOP_SUBSCRIPTION').
 */
@Entity('shop_subscriptions')
@Index('idx_shop_subscriptions_user', ['userId'], { unique: true })
export class ShopSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  paidUntil: Date | null;

  /** What the last renewal cost — display only. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lastAmount: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
