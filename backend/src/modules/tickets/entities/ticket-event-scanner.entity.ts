import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A door-team member for one event — the organizer assigns them by email, and
 * any logged-in user whose account email matches can scan tickets for that
 * event (POST /tickets/scan). Email-keyed on purpose: the organizer knows the
 * person's email, not their platform uuid, and the person may only register
 * after being assigned.
 */
@Entity('ticket_event_scanners')
@Index('idx_ticket_scanners_event', ['eventId'])
@Index('uq_ticket_scanners_event_email', ['eventId', 'email'], { unique: true })
export class TicketEventScanner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  /** Stored lowercase — matched case-insensitively against the JWT email. */
  @Column({ type: 'varchar', length: 160 })
  email: string;

  /** Display label for the organizer's door-team list ("Uncle Ba J"). */
  @Column({ type: 'varchar', length: 120, nullable: true })
  name: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
