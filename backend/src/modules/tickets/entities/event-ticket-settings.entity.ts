import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Ticketing monetization — effectively a single row (get-or-create), same
 * pattern as AdSettings / BillingSettings. Admin-edited from the "Tickets"
 * tab. A plain decimal default is safe under synchronize; only json column
 * defaults are the hazard (see billing-settings.entity.ts).
 */
@Entity('event_ticket_settings')
export class EventTicketSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Percent of each ticket sale kept by the platform; the rest is credited
   *  to the seller's venture balance. */
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 5 })
  commissionPercent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
