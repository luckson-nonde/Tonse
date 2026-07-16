import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LedgerJournal } from './ledger-journal.entity';

export type EntryDirection = 'DEBIT' | 'CREDIT';

/**
 * One line of a journal. Append-only (enforced by DB trigger).
 *
 * Amounts are always POSITIVE and carry an explicit `direction`, rather than a
 * signed amount. That kills the "negative credit" ambiguity, makes the balance
 * check a trivial sum-by-direction, and lets a CHECK constraint reject zero or
 * negative money outright.
 */
@Entity('ledger_entries')
@Index('idx_ledger_entries_journal', ['journalId'])
@Index('idx_ledger_entries_account_code', ['accountCode'])
@Index('idx_ledger_entries_quote', ['quoteId'])
@Index('idx_ledger_entries_counterparty', ['counterpartyId'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  journalId: string;

  // RESTRICT: a journal can never be deleted out from under its lines.
  @ManyToOne(() => LedgerJournal, (journal) => journal.entries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'journalId' })
  journal: LedgerJournal;

  @Column({ type: 'uuid' })
  accountId: string;

  /** Denormalised from ledger_accounts so balance queries never need the join. */
  @Column({ type: 'varchar', length: 64 })
  accountCode: string;

  @Column({ type: 'enum', enum: ['DEBIT', 'CREDIT'] })
  direction: EntryDirection;

  /** Always > 0 (CHECK constraint installed at boot). Direction carries sign. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'char', length: 3, default: 'ZMW' })
  currency: string;

  @Column({ type: 'int', default: 0 })
  lineNo: number;

  // ===== Dimensions — the detail behind the control account =====

  /**
   * The party this line concerns (buyer, seller). DELIBERATELY NO FK to users:
   * the ledger is retained (AML/tax) while a user may be erased, and an FK
   * would either force a cascade that destroys financial records or make
   * `deleteAccount` throw against the append-only triggers.
   */
  @Column({ type: 'uuid', nullable: true })
  counterpartyId: string;

  /** Denormalised label so the trail still names the party post-erasure. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  counterpartyLabel: string;

  @Column({ type: 'uuid', nullable: true })
  quoteId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @CreateDateColumn()
  createdAt: Date;
}
