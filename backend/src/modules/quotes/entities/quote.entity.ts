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
import { Inquiry } from '../../inquiries/entities/inquiry.entity';

@Entity('quotes')
@Index('idx_quotes_inquiry_id', ['inquiryId'])
@Index('idx_quotes_provider_id', ['providerId'])
@Index('idx_quotes_status', ['status'])
@Index('idx_quotes_created_at', ['createdAt'])
@Index('idx_quotes_inquiry_provider', ['inquiryId', 'providerId']) // Removed unique: true to allow revisions
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inquiryId: string;

  // RESTRICT, not CASCADE: a quote can hold the buyer's money in escrow, and
  // cascading meant deleting an inquiry silently vaporised its PAID quotes —
  // destroying the escrow record with no trace and no refund. Callers must now
  // remove an inquiry's quotes deliberately (see InquiriesService.remove, which
  // refuses while any quote holds escrow), so money can never be erased as a
  // side-effect of deleting a request.
  @ManyToOne(() => Inquiry, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inquiryId' })
  inquiry: Inquiry;

  @Column({ type: 'varchar', length: 255 })
  inquiryTitle: string;

  @Column({ type: 'uuid' })
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Column({ type: 'varchar', length: 255 })
  providerName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 50 })
  condition: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: [
      'PENDING',
      'ACCEPTED',
      'REJECTED',
      'ARCHIVED',
      // Collection initiated with the PSP, payer hasn't approved yet. NOT an
      // escrow-holding status — no money has moved.
      'PAYMENT_PENDING',
      'PAID',
      'PENDING_COLLECTION',
      'AWAITING_PICKUP',
      'COMPLETED',
      'HANDED_OVER',
      'SUPERSEDED', // Added for original quotes that were revised and accepted
      // Terminal exits for a paid deal. PAID previously had NO way out, which
      // is why cancelled orders stranded escrow forever.
      'CANCELLED',
      'REFUNDED',
    ],
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  expiryDuration: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'json', nullable: true })
  itemPrices: Record<string, any>[];

  @Column({ type: 'json', nullable: true })
  buyerContact: Record<string, any>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  collectionCode: string;

  @Column({ type: 'json', nullable: true })
  requirements: Record<string, any>[];

  @Column({ type: 'uuid', nullable: true })
  venueSpaceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  venueSpaceName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  damageDeposit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cleaningFee: number;

  @Column({ type: 'json', nullable: true })
  dynamicFields: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['EXPRESS', 'STANDARD'],
    default: 'STANDARD',
  })
  processType: string;

  @Column({ type: 'json', nullable: true })
  delivery: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pickupLocation: string;

  @Column({
    type: 'enum',
    enum: ['ORIGINAL', 'REVISION'],
    default: 'ORIGINAL',
  })
  quoteType: string;

  @Column({ type: 'uuid', nullable: true })
  parentQuoteId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
