import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { InquiryImage } from './inquiry-image.entity';

@Entity('inquiries')
@Index('idx_inquiries_buyer_id', ['buyerId'])
@Index('idx_inquiries_category', ['category'])
@Index('idx_inquiries_status', ['status'])
@Index('idx_inquiries_location', ['location'])
@Index('idx_inquiries_created_at', ['createdAt'])
@Index('idx_inquiries_buyer_status', ['buyerId', 'status'])
@Index('idx_inquiries_display_id', ['displayId'], { unique: true })
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  displayId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid' })
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  /** Human-readable "City, Province" snapshot for display. */
  @Column({ type: 'varchar', length: 255 })
  location: string;

  /**
   * Province + city are the inquiry's matching scope. The city is the
   * destination the inquiry resolves against; without coordinates
   * below, the backend broadcasts to every provider in this city.
   * Coordinates are an optional refinement that narrows matching to a
   * radius around the point.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'integer', nullable: true })
  radius: number;

  @Column({ type: 'json', nullable: true })
  items: Record<string, any>[];

  @Column({ type: 'json', nullable: true })
  preferences: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['EXPRESS', 'STANDARD'],
    default: 'STANDARD',
  })
  processType: string;

  @Column({
    type: 'enum',
    enum: ['OPEN', 'QUOTED', 'CLOSED'],
    default: 'OPEN',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['quotation', 'purchase_order', 'order_confirmation', 'delivery_order', 'completed'],
    default: 'quotation',
  })
  currentStage: string;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'simple-array', default: '' })
  archivedBy: string[];

  @Column({ type: 'simple-array', default: '' })
  deletedBy: string[];

  @Column({ type: 'boolean', default: false })
  isLabour: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  labourGroup: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  labourSubType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => InquiryImage, (image) => image.inquiry, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
  })
  images: InquiryImage[];
  // @OneToMany(() => Quote, (quote) => quote.inquiry)
  // quotes: Quote[];
}
