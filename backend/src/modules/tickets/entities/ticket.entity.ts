import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type TicketStatus = 'VALID' | 'REDEEMED' | 'VOID';

/**
 * One admitted unit — each attendee gets their own TIX-XXXXXX code.
 * `status` future-proofs door check-in and refunds; no endpoint mutates it yet.
 */
@Entity('tickets')
@Index('idx_tickets_order', ['orderId'])
@Index('idx_tickets_event', ['eventId'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  tierId: string;

  @Index('idx_tickets_code', { unique: true })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'enum', enum: ['VALID', 'REDEEMED', 'VOID'], default: 'VALID' })
  status: TicketStatus;

  @CreateDateColumn()
  createdAt: Date;
}
