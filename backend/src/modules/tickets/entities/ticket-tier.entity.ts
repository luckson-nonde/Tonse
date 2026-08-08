import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TicketEvent } from './ticket-event.entity';

/**
 * One price tier of an event (Standard / VIP / Early-bird …).
 *
 * `remainingQuantity` is the ONLY stock authority — decremented under a
 * `FOR UPDATE` lock in the purchase commit, never recomputed from sold
 * tickets. `totalQuantity` stays as the seller-entered capacity for display.
 */
@Entity('ticket_tiers')
@Index('idx_ticket_tiers_event', ['eventId'])
export class TicketTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  priceZmw: number;

  @Column({ type: 'integer' })
  totalQuantity: number;

  @Column({ type: 'integer' })
  remainingQuantity: number;

  @ManyToOne(() => TicketEvent, (event) => event.tiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: TicketEvent;
}
