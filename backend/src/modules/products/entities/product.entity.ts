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

@Entity('products')
@Index('idx_products_seller_id', ['sellerId'])
@Index('idx_products_category', ['category'])
@Index('idx_products_name', ['name'])
@Index('idx_products_created_at', ['createdAt'])
@Index('idx_products_seller_category', ['sellerId', 'category'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subCategory: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  originalPrice: number;

  @Column({ type: 'integer', default: 0 })
  stock: number;

  @Column({ type: 'simple-array', default: '' })
  images: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  condition: string;

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
