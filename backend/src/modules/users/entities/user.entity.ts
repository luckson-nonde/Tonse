import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_phone', ['phone'])
@Index('idx_users_role', ['role'])
@Index('idx_users_verification_status', ['verificationStatus'])
@Index('idx_users_created_at', ['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'text', select: false })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nrc: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: [
      'BUYER',
      'SELLER',
      'SUPPLIER',
      'SERVICE_PROVIDER',
      'ENTERTAINMENT',
      'EVENTS',
    ],
  })
  role: string;

  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  @Column({
    type: 'enum',
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING',
  })
  verificationStatus: string;

  @Column({ type: 'uuid', nullable: true })
  businessLicenseId: string;

  @Column({ type: 'text', nullable: true })
  socialLinks: string; // JSON stringified

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  // Relations (to be populated by other modules)
  // @OneToMany(() => Inquiry, (inquiry) => inquiry.buyer)
  // inquiries: Inquiry[];

  // @OneToMany(() => Quote, (quote) => quote.provider)
  // quotes: Quote[];
}
