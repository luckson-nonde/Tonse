import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('shops')
@Index('idx_shops_seller_id', ['sellerId'], { unique: true })
@Index('idx_shops_name', ['name'])
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  sellerId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  coverImage: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'json', nullable: true })
  socialLinks: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  contactInfo: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number;

  @Column({ type: 'integer', default: 0 })
  followerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
