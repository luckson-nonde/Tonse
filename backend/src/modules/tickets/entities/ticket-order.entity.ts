import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type TicketOrderStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface TicketOrderLineItem {
  tierId: string;
  tierName: string;
  quantity: number;
  unitPriceZmw: number;
}

/**
 * A guest's purchase attempt. Created PENDING at checkout (no stock held),
 * flipped to PAID inside the one atomic simulate-payment transaction that
 * decrements tier stock, mints Ticket rows and posts the TICKET_SALE journal.
 *
 * With no PspTransaction behind the (simulated) payment, this row IS the
 * audit trail — the journal's memo points back at it.
 */
@Entity('ticket_orders')
@Index('idx_ticket_orders_event', ['eventId'])
export class TicketOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  /** Client-facing polling handle (TKT-<ts>-<hex>), never the row uuid. */
  @Index('idx_ticket_orders_reference', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  reference: string;

  @Column({ type: 'varchar', length: 120 })
  buyerName: string;

  /** At least one of phone/email is enforced in the service — the DTO keeps
   *  both optional so either alone is enough for a guest. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  buyerPhone: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  buyerEmail: string | null;

  /** Priced server-side from ticket_tiers at checkout — never client-sent. */
  @Column({ type: 'json' })
  lineItems: TicketOrderLineItem[];

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  totalAmountZmw: number;

  /** Platform cut, stamped at payment time from the THEN-current settings —
   *  seller net stats must not drift when the admin later edits the rate. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  commissionZmw: number | null;

  @Column({ type: 'enum', enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' })
  status: TicketOrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
