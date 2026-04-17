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

@Entity('schedules')
@Index('idx_schedules_user_id', ['userId'])
@Index('idx_schedules_date', ['date'])
@Index('idx_schedules_type', ['type'])
@Index('idx_schedules_created_at', ['createdAt'])
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({
    type: 'enum',
    enum: ['DELIVERY', 'MEETING', 'SERVICE', 'REMINDER', 'OTHER'],
    default: 'OTHER',
  })
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
