import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Admin-configured promoter goal: "reach `requiredCount` conversions at
 * `targetStage` to unlock `equitySharesReward` shares".
 *
 * Global — every promoter races the same milestone set. targetStage never
 * includes 'registration' (trivially true for every conversion row).
 *
 * Deleting a milestone that has paid out is blocked by the RESTRICT FK on
 * equity_awards — admins deactivate instead, so the ledger stays intact.
 */
@Entity('milestones')
@Index('idx_milestones_target_stage', ['targetStage'])
@Index('idx_milestones_active', ['isActive'])
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: ['inquiry', 'trade_complete'],
  })
  targetStage: string;

  @Column({ type: 'int' })
  requiredCount: number;

  /** decimal(12,2) mirrors quotes.price / payments.amount precision. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  equitySharesReward: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
