/**
 * Loan helpers shared across buyer + lender surfaces so loan requests read in
 * lending terminology (offers/lenders, not quotes/suppliers) and each loan
 * TYPE (collateral / salary / government) can be handled distinctly — pricing
 * defaults, terms & conditions, etc.
 */

export type LoanTypeKey = 'collateral' | 'salary' | 'government';

/** True if any of the passed category ids / names / titles denotes a loan. */
export function isLoanContext(
  ...vals: Array<string | string[] | undefined | null>
): boolean {
  const hay = vals
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  // Match 'loan', 'loans', 'loan-collateral', 'Government Employee Loan',
  // 'lending' — a plain \bloan\b would miss "loans" (no boundary before the s).
  return /loan|lending/.test(hay);
}

/**
 * True when a Quote is a loan OFFER (condition LOAN) or a lender DECLINE
 * (condition DECLINED) rather than a marketplace quote. A loan is
 * accepted/countered, never "paid", so it lives on its own "Loan Offers"
 * surface. Single source for a rule previously duplicated in the buyer
 * dashboard and the sidebar badge logic.
 */
export function isLoanQuote(q: any): boolean {
  return ['LOAN', 'DECLINED'].includes(String(q?.condition || '').toUpperCase());
}

/** Resolve the loan sub-type from a category id ('loan-government') or a
 *  display name ('Government Employee Loan'). Returns null when not a loan. */
export function loanTypeKey(...vals: Array<string | string[] | undefined | null>): LoanTypeKey | null {
  const s = vals.flat().filter(Boolean).join(' ').toLowerCase();
  if (!isLoanContext(s)) return null;
  if (/govern|public/.test(s)) return 'government';
  if (/salary|payroll|employ/.test(s)) return 'salary';
  if (/collateral|secured|asset/.test(s)) return 'collateral';
  return 'collateral';
}

export const LOAN_TYPE_LABEL: Record<LoanTypeKey, string> = {
  collateral: 'Collateral Loan',
  salary: 'Salary Loan',
  government: 'Government Employee Loan',
};

/** Sensible default interest method per loan type — payroll/salary loans are
 *  almost always reducing-balance; asset-backed collateral loans are commonly
 *  quoted flat. Used to pre-fill the offer form so lenders type less. */
export const DEFAULT_INTEREST_TYPE: Record<LoanTypeKey, 'Flat' | 'Reducing Balance'> = {
  collateral: 'Flat',
  salary: 'Reducing Balance',
  government: 'Reducing Balance',
};

const monthsOf = (t: any): number => {
  const m = String(t ?? '').match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

/**
 * Compute the monthly repayment for a loan offer from the principal, the
 * monthly interest rate, the tenure and the interest method.
 *  - Flat: interest each month = principal × rate; principal repaid evenly.
 *  - Reducing Balance: standard amortising installment.
 * Returns 0 when inputs are insufficient.
 */
export function computeMonthlyRepayment(params: {
  principal: number;
  monthlyRatePct: number;
  tenure: string | number;
  interestType: string;
}): number {
  const P = Number(params.principal) || 0;
  const r = (Number(params.monthlyRatePct) || 0) / 100;
  const n = typeof params.tenure === 'number' ? params.tenure : monthsOf(params.tenure);
  if (P <= 0 || n <= 0) return 0;

  const reducing = /reduc/i.test(params.interestType || '');
  if (reducing && r > 0) {
    const pow = Math.pow(1 + r, n);
    return (P * r * pow) / (pow - 1);
  }
  // Flat (or zero-interest): even principal + flat monthly interest.
  return P / n + P * r;
}

export const roundZmw = (v: number): number => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Post-acceptance loan lifecycle. Stored on the accepted quote's
 * `dynamicFields.stage` (no new enum/table — mirrors the `counter` pattern).
 * The lender advances it forward-only; the borrower's tracker reflects it live.
 *   ACCEPTED → CONTACTED → VERIFIED → DISBURSED → COMPLETED
 */
export const LOAN_STAGES = ['ACCEPTED', 'CONTACTED', 'VERIFIED', 'DISBURSED', 'COMPLETED'] as const;
export type LoanStage = (typeof LOAN_STAGES)[number];

/** Index of a stage (defaults to ACCEPTED=0 for an accepted loan with no stage yet). */
export function loanStageIndex(stage?: string | null): number {
  const i = LOAN_STAGES.indexOf(String(stage || 'ACCEPTED').toUpperCase() as LoanStage);
  return i < 0 ? 0 : i;
}

/** Human label for the CURRENT stage (for status chips). */
export const LOAN_STAGE_LABEL: Record<LoanStage, string> = {
  ACCEPTED: 'Accepted',
  CONTACTED: 'Contacted',
  VERIFIED: 'Documents verified',
  DISBURSED: 'Funds disbursed',
  COMPLETED: 'Completed',
};

/** The lender's next forward move + its button label, or null when complete. */
export function nextLoanStage(current?: string | null): { stage: LoanStage; label: string } | null {
  const idx = loanStageIndex(current);
  const next = LOAN_STAGES[idx + 1];
  if (!next) return null;
  const labels: Record<LoanStage, string> = {
    ACCEPTED: 'Accepted',
    CONTACTED: 'Mark as contacted',
    VERIFIED: 'Mark documents verified',
    DISBURSED: 'Mark funds disbursed',
    COMPLETED: 'Mark loan completed',
  };
  return { stage: next, label: labels[next] };
}
