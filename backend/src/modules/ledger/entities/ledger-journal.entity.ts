import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { LedgerEntry } from './ledger-entry.entity';

/**
 * A journal — one balanced money event (funding, release, refund, payout…).
 *
 * APPEND-ONLY. There is no update and no delete: a correction is a REVERSAL
 * journal that points back via `reversesJournalId`. DB triggers enforce this,
 * because app-level discipline is exactly what let the old `payments` table be
 * edited and deleted by its own subjects.
 *
 * Its entries must satisfy SUM(debits) = SUM(credits); a DEFERRED constraint
 * trigger checks that at COMMIT (not per row, so lines can insert one by one).
 */
export type LedgerJournalType =
  | 'ESCROW_FUNDED'
  | 'ESCROW_RELEASED'
  | 'VENTURE_DEPOSIT'
  | 'AD_PURCHASE'
  | 'AD_REJECTED_REFUND'
  | 'REFUND_INITIATED'
  | 'REFUND_SETTLED'
  | 'PAYOUT_INITIATED'
  | 'PAYOUT_SETTLED'
  | 'REVERSAL'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE';

export const LEDGER_JOURNAL_TYPES: LedgerJournalType[] = [
  'ESCROW_FUNDED',
  'ESCROW_RELEASED',
  'VENTURE_DEPOSIT',
  'AD_PURCHASE',
  'AD_REJECTED_REFUND',
  'REFUND_INITIATED',
  'REFUND_SETTLED',
  'PAYOUT_INITIATED',
  'PAYOUT_SETTLED',
  'REVERSAL',
  'ADJUSTMENT',
  'OPENING_BALANCE',
];

@Entity('ledger_journals')
@Index('idx_ledger_journals_reference', ['reference'], { unique: true })
@Index('idx_ledger_journals_idempotency', ['idempotencyKey'], { unique: true })
@Index('idx_ledger_journals_type', ['type'])
@Index('idx_ledger_journals_quote', ['quoteId'])
@Index('idx_ledger_journals_posted_at', ['postedAt'])
export class LedgerJournal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-facing reference (`JRN-…`). The admin ledger shows this — the old
   *  finance table rendered a raw uuid because no real reference existed. */
  @Column({ type: 'varchar', length: 40, unique: true })
  reference: string;

  @Column({ type: 'enum', enum: LEDGER_JOURNAL_TYPES })
  type: LedgerJournalType;

  /**
   * The most important column here. Makes replays a no-op at the DATABASE
   * level rather than relying on app logic — a PSP will redeliver the same
   * webhook, and a double-post is a double-spend. Shape: `escrow-funded:<pspTxnId>`,
   * `escrow-released:<quoteId>`, `venture-deposit:<pspTxnId>`, `refund-initiated:<refundId>`.
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @Column({ type: 'char', length: 3, default: 'ZMW' })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  quoteId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @Column({ type: 'uuid', nullable: true })
  pspTransactionId: string;

  /** Set on a REVERSAL — the journal being corrected. */
  @Column({ type: 'uuid', nullable: true })
  reversesJournalId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** Who caused this, captured from the request audit context (actor + IP + UA
   *  live on the audit trail; this is the denormalised label so the journal
   *  still names the actor after that user is erased). */
  @Column({ type: 'varchar', length: 120, nullable: true })
  actorLabel: string;

  /**
   * Non-accounting context: the PSP fee and who bore it, the commission rate
   * applied, the gross the payer was charged. The buyer-borne PSP fee is a MEMO
   * and deliberately NOT an entry — that money never enters Nyuwe's account, so
   * journaling it would inflate both sides and break reconciliation to the PSP
   * balance.
   */
  @Column({ type: 'json', nullable: true })
  memo: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  postedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => LedgerEntry, (entry) => entry.journal)
  entries: LedgerEntry[];
}
