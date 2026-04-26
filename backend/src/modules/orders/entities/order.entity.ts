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
import { Quote } from '../../quotes/entities/quote.entity';

@Entity('orders')
@Index('idx_orders_buyer_id', ['buyerId'])
@Index('idx_orders_seller_id', ['sellerId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_created_at', ['createdAt'])
@Index('idx_orders_buyer_seller', ['buyerId', 'sellerId'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  quoteId: string;

  @ManyToOne(() => Quote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quoteId' })
  quote: Quote;

  @Column({ type: 'uuid' })
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column({ type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  deliveryFee: number;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shippingAddress: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  items: Record<string, any>[];

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
