import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Milestone } from './milestone.entity';

/**
 * Simulated equity ledger — one row per (promoter, milestone), ever.
 *
 * The UNIQUE(promoterUserId, milestoneId) constraint IS the concurrency
 * model: two simultaneous qualifying trade-completions can both pass the
 * count>=required check (READ COMMITTED lets them), both attempt the
 * insert, and Postgres rejects the loser with 23505 — which the award
 * engine swallows. No isolation tricks, exactly one award ever lands.
 *
 * sharesAwarded is a SNAPSHOT of the milestone's reward at award time, so
 * a later admin edit never rewrites history (same convention as
 * quotes.inquiryTitle). milestoneId FK is RESTRICT — a paid-out milestone
 * can't be deleted, only deactivated.
 */
@Entity('equity_awards')
@Unique('uq_equity_awards_promoter_milestone', ['promoterUserId', 'milestoneId'])
@Index('idx_equity_awards_promoter', ['promoterUserId'])
export class EquityAward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  promoterUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoterUserId' })
  promoter: User;

  @Column({ type: 'uuid' })
  milestoneId: string;

  @ManyToOne(() => Milestone, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'milestoneId' })
  milestone: Milestone;

  /** Snapshot of milestone.equitySharesReward at award time. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  sharesAwarded: number;

  /** Qualifying-conversion count observed when the award fired (audit). */
  @Column({ type: 'int' })
  countAtAward: number;

  /** Doubles as "awardedAt". */
  @CreateDateColumn()
  createdAt: Date;
}
