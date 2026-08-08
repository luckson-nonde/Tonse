import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TicketTier } from './ticket-tier.entity';

export type TicketEventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

/**
 * A seller-created ticketed event, sold through the public share link
 * `/e/:code`. Unlike ads there is no approval gate — an event is the seller's
 * own page, not platform real estate, so it's live the moment it's created.
 */
@Entity('ticket_events')
@Index('idx_ticket_events_seller', ['sellerId'])
export class TicketEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  /** Public share code (EVT-XXXXXX), derived from the row id post-insert —
   *  same two-step as inquiry QIDs. What guests type/click, never the uuid. */
  @Index('idx_ticket_events_code', { unique: true })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  /** Free-text venue/location — "Levy Junction Rooftop, Lusaka". */
  @Column({ type: 'varchar', length: 500 })
  venue: string;

  /** When the event happens (DateTimePicker datetime mode on the seller form). */
  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  posterUrl: string | null;

  @Column({ type: 'enum', enum: ['DRAFT', 'PUBLISHED', 'CANCELLED'], default: 'PUBLISHED' })
  status: TicketEventStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TicketTier, (tier) => tier.event)
  tiers: TicketTier[];
}
