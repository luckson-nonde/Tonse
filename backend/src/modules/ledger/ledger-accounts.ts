import { LedgerAccountType, NormalSide } from './entities/ledger-account.entity';

/** Account codes, referenced by services instead of uuids. */
export const ACCOUNT = {
  PSP_HOLDING: 'PSP_HOLDING_ZMW',
  ESCROW_LIABILITY: 'ESCROW_LIABILITY_ZMW',
  SELLER_PAYABLE: 'SELLER_PAYABLE_ZMW',
  REFUND_PAYABLE: 'REFUND_PAYABLE_ZMW',
  PSP_PAYOUT_IN_FLIGHT: 'PSP_PAYOUT_IN_FLIGHT_ZMW',
  PLATFORM_COMMISSION_REVENUE: 'PLATFORM_COMMISSION_REVENUE_ZMW',
  AD_REVENUE: 'AD_REVENUE_ZMW',
  PSP_FEE_EXPENSE: 'PSP_FEE_EXPENSE_ZMW',
  SUSPENSE: 'SUSPENSE_ZMW',
} as const;

interface AccountSeed {
  code: string;
  name: string;
  type: LedgerAccountType;
  normalSide: NormalSide;
  currency: string;
  description: string;
}

/**
 * The fixed chart of accounts. Nyuwe never custodies funds — the PSP does — so
 * these mirror money held at the PSP and who has a claim on it.
 */
export const LEDGER_ACCOUNTS: AccountSeed[] = [
  {
    code: ACCOUNT.PSP_HOLDING,
    name: 'Funds held at PSP',
    type: 'ASSET',
    normalSide: 'DEBIT',
    currency: 'ZMW',
    description:
      "Nyuwe's claim on money sitting in the PSP's segregated holding account. MUST reconcile to the balance the PSP reports — any delta is a missed webhook or a timing gap.",
  },
  {
    code: ACCOUNT.ESCROW_LIABILITY,
    name: 'Escrow held for deals',
    type: 'LIABILITY',
    normalSide: 'CREDIT',
    currency: 'ZMW',
    description:
      'Money owed on an unresolved deal — released to the seller on handover, or refunded to the buyer on cancellation. Per-quote balance is the escrow position.',
  },
  {
    code: ACCOUNT.SELLER_PAYABLE,
    name: 'Payable to sellers',
    type: 'LIABILITY',
    normalSide: 'CREDIT',
    currency: 'ZMW',
    description:
      'Earned by the seller (escrow released, commission deducted) but not yet paid out. Paid on a schedule, never on demand — a balance the user controls would look like stored value.',
  },
  {
    code: ACCOUNT.REFUND_PAYABLE,
    name: 'Refunds owed to buyers',
    type: 'LIABILITY',
    normalSide: 'CREDIT',
    currency: 'ZMW',
    description:
      'Refund approved and escrow discharged, but the money has not yet landed with the buyer. A failed refund STAYS here — the buyer is still owed.',
  },
  {
    code: ACCOUNT.PSP_PAYOUT_IN_FLIGHT,
    name: 'Payouts in flight',
    type: 'LIABILITY',
    normalSide: 'CREDIT',
    currency: 'ZMW',
    description:
      'Payout instructed but not yet confirmed by the PSP. Keeps PSP_HOLDING equal to the real PSP balance while money is neither party’s.',
  },
  {
    code: ACCOUNT.PLATFORM_COMMISSION_REVENUE,
    name: 'Platform commission revenue',
    type: 'REVENUE',
    normalSide: 'CREDIT',
    currency: 'ZMW',
    description: "Nyuwe's commission, deducted from the seller's release.",
  },
  {
    code: ACCOUNT.AD_REVENUE,
    name: 'Ad placement revenue',
    type: 'REVENUE',
    normalSide: 'CREDIT',
    currency: 'ZMW',
    description:
      'Earned when a seller-purchased ad placement (homepage banner / sidebar) is paid for. Debited back on admin rejection.',
  },
  {
    code: ACCOUNT.PSP_FEE_EXPENSE,
    name: 'PSP fees borne by Nyuwe',
    type: 'EXPENSE',
    normalSide: 'DEBIT',
    currency: 'ZMW',
    description:
      'PSP fees Nyuwe actually pays (payouts, refunds). NOT the collection fee: the buyer bears that, the PSP keeps it, and it never enters our holding account — recording it here would inflate the books with money we never held.',
  },
  {
    code: ACCOUNT.SUSPENSE,
    name: 'Suspense',
    type: 'ASSET',
    normalSide: 'DEBIT',
    currency: 'ZMW',
    description:
      'Receipts that cannot yet be attributed to a deal. Must be cleared by an admin — a balance here is an operational alarm, not a resting place.',
  },
];
