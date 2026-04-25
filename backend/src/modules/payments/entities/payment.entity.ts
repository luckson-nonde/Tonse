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

@Entity('payments')
@Index('idx_payments_user_id', ['userId'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_type', ['type'])
@Index('idx_payments_created_at', ['createdAt'])
@Index('idx_payments_reference', ['externalReference'], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  transactionId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['DEPOSIT', 'PAYMENT', 'WITHDRAWAL', 'REFUND', 'TRANSFER'],
  })
  type: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  netAmount: number;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalReference: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
