import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type TicketStatus = 'VALID' | 'REDEEMED' | 'VOID';

/**
 * One admitted unit — each attendee gets their own TIX-XXXXXX code.
 * Door check-in flips status VALID → REDEEMED (POST /tickets/scan), stamping
 * when and by whom; VOID is reserved for refunds.
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

  /** Set once, at the door — the moment this ticket was scanned in. */
  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date | null;

  /** The user (organizer or assigned door manager) who scanned it. */
  @Column({ type: 'uuid', nullable: true })
  checkedInBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
