import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PspTransactionType = 'COLLECTION' | 'REFUND' | 'PAYOUT';
export type PspTransactionStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'PAY_OFFLINE' | 'CANCELLED';
export type FeeBearer = 'customer' | 'merchant';

/**
 * The PSP-side record of a money movement — our copy of what the provider did.
 *
 * Separate from the ledger on purpose: the ledger is Nyuwe's ACCOUNTING view
 * (balanced, append-only), while this is the OPERATIONAL view (provider refs,
 * retries, raw payloads, fees). One PSP transaction produces zero or more
 * journals; a PENDING collection has no journal at all until it succeeds.
 *
 * Written BEFORE the outbound HTTP call and keyed on our own reference, so a
 * webhook that arrives before the API response still finds its row.
 */
@Entity('psp_transactions')
@Index('idx_psp_tx_reference', ['reference'], { unique: true })
@Index('idx_psp_tx_idempotency', ['idempotencyKey'], { unique: true })
@Index('idx_psp_tx_provider_ref', ['providerReference'])
@Index('idx_psp_tx_quote', ['quoteId'])
@Index('idx_psp_tx_status', ['status'])
export class PspTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** OUR reference, generated before the PSP call — the correlation key. */
  @Column({ type: 'varchar', length: 64, unique: true })
  reference: string;

  /** The PSP's own id/reference, once known. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  providerReference: string;

  @Column({ type: 'varchar', length: 32, default: 'sandbox' })
  provider: string;

  @Column({ type: 'enum', enum: ['COLLECTION', 'REFUND', 'PAYOUT'] })
  type: PspTransactionType;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'PAY_OFFLINE', 'CANCELLED'],
    default: 'PENDING',
  })
  status: PspTransactionStatus;

  /** The amount that should reach (or leave) the holding account. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  /**
   * MEMO ONLY — deliberately not a ledger entry. With `feeBearer = 'customer'`
   * the payer is charged amount + fee, the PSP keeps the fee, and only `amount`
   * is remitted to us. Journaling that fee would inflate the books with money
   * Nyuwe never held and break reconciliation against the PSP balance. It lives
   * here so the admin can still see the full picture: gross charged, fee, net.
   */
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  feeAmount: string;

  @Column({ type: 'enum', enum: ['customer', 'merchant'], default: 'customer' })
  feeBearer: FeeBearer;

  @Column({ type: 'char', length: 3, default: 'ZMW' })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  quoteId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  /** The party paying or being paid. No FK — see LedgerEntry.counterpartyId.
   *  For a cash sale this is the buyer; for a financed disbursement it's the
   *  LENDER (who pays the principal into the holding account). */
  @Column({ type: 'uuid', nullable: true })
  counterpartyId: string;

  /**
   * The deal's BUYER, when the payer differs from them — i.e. a financed
   * disbursement, where the lender (`counterpartyId`) pays but the order and
   * escrow belong to the buyer. Null for a cash sale (buyer = payer).
   */
  @Column({ type: 'uuid', nullable: true })
  beneficiaryBuyerId: string;

  /**
   * Funding context for non-cash sources. For financed checkout:
   * `{ source:'LOAN', loanQuoteId, loanInquiryId, lenderId }`. Drives the
   * side-effects applied when escrow funds (advance the loan offer to
   * DISBURSED, flip the product quote's financing to FUNDED) — so those only
   * ever happen on a verified receipt.
   */
  @Column({ type: 'json', nullable: true })
  context: Record<string, any>;

  /** PII — scrubbed on account erasure, alongside rawPayload. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  payerMsisdn: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  channel: string;

  /** Full provider payload for dispute/forensics. Contains PII → scrubbed on erasure. */
  @Column({ type: 'json', nullable: true })
  rawPayload: Record<string, any>;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
