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

@Entity('audit_logs')
@Index('idx_audit_logs_user_id', ['userId'])
@Index('idx_audit_logs_action', ['action'])
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
@Index('idx_audit_logs_created_at', ['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  providerId: string;

  @Column({ type: 'uuid', nullable: true })
  staffId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  staffName: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetTitle: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  buyerName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'text', nullable: true })
  changes: string; // JSON stringified

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
