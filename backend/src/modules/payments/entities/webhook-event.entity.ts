import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Every webhook delivery we accept, stored raw.
 *
 * Two reasons this table exists:
 *   1. IDEMPOTENCY — providers retry. The unique (provider, eventId) index
 *      means a redelivered event is rejected by the DATABASE, not by app logic.
 *      Combined with the journal's own idempotency key, a replayed "payment
 *      succeeded" can never post twice (i.e. never double-credit escrow).
 *   2. FORENSICS — the raw payload is the evidence in a payment dispute.
 */
@Entity('webhook_events')
@Index('idx_webhook_events_provider_event', ['provider', 'eventId'], { unique: true })
@Index('idx_webhook_events_reference', ['reference'])
export class WebhookEventRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  provider: string;

  /** The provider's event id — the delivery idempotency key. */
  @Column({ type: 'varchar', length: 128 })
  eventId: string;

  @Column({ type: 'varchar', length: 32, default: 'unknown' })
  type: string;

  /** Our correlation reference, echoed back by the provider. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  reference: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  status: string;

  /** Raw payload — may contain PII (payer name/phone); scrubbed on erasure. */
  @Column({ type: 'json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'text', nullable: true })
  processingError: string;

  @CreateDateColumn()
  receivedAt: Date;
}
