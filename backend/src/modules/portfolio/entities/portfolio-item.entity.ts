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
 * A piece of past work an entertainment provider (DJ, band, MC, dancer,
 * speaker, etc.) showcases on their performance catalog. Embeds a YouTube
 * URL so buyers viewing a quote — or browsing the provider's profile —
 * can preview the artist's actual work as social proof of capability.
 *
 * Owned by `userId`. Publicly readable so anyone holding a quote/profile
 * link can render the embeds without auth; mutations are restricted to
 * the owner via the controller.
 */
@Entity('portfolio_items')
@Index('idx_portfolio_user_id', ['userId'])
export class PortfolioItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  youtubeUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  eventName: string | null;

  @Column({ type: 'date', nullable: true })
  eventDate: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
