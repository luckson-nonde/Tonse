import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Chart of accounts — a small, FIXED set of control accounts.
 *
 * Deliberately NOT one account row per user: that explodes the chart and makes
 * every balance a join. Detail lives on the entry as dimensions
 * (`counterpartyId`, `quoteId`, `orderId`), so "escrow held for quote X" or
 * "payable to seller Y" is a filter over one control account.
 *
 * The accounting identity that must always hold:
 *   PSP_HOLDING = ESCROW_LIABILITY + SELLER_PAYABLE + REFUND_PAYABLE
 *               + PSP_PAYOUT_IN_FLIGHT + (COMMISSION_REVENUE - PSP_FEE_EXPENSE)
 * and PSP_HOLDING must reconcile to the real balance held at the PSP.
 */
export type LedgerAccountType = 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';
export type NormalSide = 'DEBIT' | 'CREDIT';

@Entity('ledger_accounts')
@Index('idx_ledger_accounts_code', ['code'], { unique: true })
export class LedgerAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable machine code, e.g. `ESCROW_LIABILITY_ZMW`. The code — not the uuid —
   *  is what services reference, and it's denormalised onto every entry. */
  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'enum', enum: ['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE'] })
  type: LedgerAccountType;

  /** The side that INCREASES this account. Assets/expenses grow by debit;
   *  liabilities/revenue grow by credit. Used to render balances sensibly. */
  @Column({ type: 'enum', enum: ['DEBIT', 'CREDIT'] })
  normalSide: NormalSide;

  @Column({ type: 'char', length: 3, default: 'ZMW' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
