import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Generic Idempotency-Key ledger for HTTP mutations. Any endpoint can opt in
 * just by having the caller send an `Idempotency-Key` header —
 * `IdempotencyInterceptor` is the only thing that reads/writes this table.
 *
 * Modeled on the payments ledger's `idempotencyKey` unique-guard pattern
 * (ledger_journals), generalized so it isn't tied to money movements: a row
 * starts PENDING when a request begins, flips to COMPLETED with the response
 * snapshot on success, and is deleted on a hard rejection so a failed attempt
 * never permanently blocks a retry under the same key.
 */
export type IdempotencyKeyStatus = 'PENDING' | 'COMPLETED';

@Entity('idempotency_keys')
@Index('idx_idempotency_keys_key', ['key'], { unique: true })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Client-supplied `Idempotency-Key` header value, scoped globally (not per-route). */
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'enum', enum: ['PENDING', 'COMPLETED'], default: 'PENDING' })
  status: IdempotencyKeyStatus;

  @Column({ type: 'smallint', nullable: true })
  statusCode: number | null;

  @Column({ type: 'json', nullable: true })
  responseBody: any;

  @CreateDateColumn()
  createdAt: Date;
}
