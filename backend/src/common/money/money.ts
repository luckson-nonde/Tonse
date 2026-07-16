/**
 * Money — exact arithmetic in integer NGWEE (1 ZMW = 100 ngwee).
 *
 * WHY THIS EXISTS: Postgres `numeric` is exact, but TypeORM hands decimals back
 * as STRINGS, and this codebase does `Number(quote.price)` at every call site.
 * The moment money becomes a JS float you inherit 0.1 + 0.2 = 0.30000000000000004
 * and 1-ngwee drift. A double-entry ledger has no tolerance for that: debits must
 * equal credits EXACTLY or the journal is rejected at COMMIT.
 *
 * The rule: parse once at the boundary (`toNgwee`), do every calculation in
 * integers, and format back only when writing out (`fromNgwee`).
 */

export const NGWEE_PER_KWACHA = 100;

/**
 * Parse a money value into integer ngwee.
 *
 * Strings are parsed digit-wise (never via float) so values that a float would
 * mangle — e.g. '1.005' — are handled exactly. More than 2 decimal places is a
 * programming error rather than something to silently round away, so it throws:
 * money arriving with sub-ngwee precision means an upstream calculation already
 * used floats.
 */
export function toNgwee(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;

  const raw = typeof value === 'number' ? String(value) : String(value).trim();
  if (raw === '') return 0;

  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) {
    throw new Error(`Invalid money value: ${JSON.stringify(value)}`);
  }

  const [, sign, whole, frac = ''] = match;
  if (frac.length > 2) {
    throw new Error(
      `Money value ${JSON.stringify(value)} has sub-ngwee precision — ` +
        `round it before it reaches the ledger.`,
    );
  }

  const ngwee = Number(whole) * NGWEE_PER_KWACHA + Number(frac.padEnd(2, '0') || 0);
  if (!Number.isSafeInteger(ngwee)) {
    throw new Error(`Money value out of safe range: ${JSON.stringify(value)}`);
  }
  return sign ? -ngwee : ngwee;
}

/** Format integer ngwee back to a 2dp decimal string for the DB / API. */
export function fromNgwee(ngwee: number): string {
  if (!Number.isInteger(ngwee)) {
    throw new Error(`fromNgwee expects whole ngwee, got ${ngwee}`);
  }
  const negative = ngwee < 0;
  const abs = Math.abs(ngwee);
  const whole = Math.floor(abs / NGWEE_PER_KWACHA);
  const frac = String(abs % NGWEE_PER_KWACHA).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/**
 * Split a principal into the platform's commission and the seller's net.
 *
 * CRITICAL: the net is DERIVED as `principal - commission`, never calculated
 * independently. Computing both from the rate lets them round apart, and the
 * 1-ngwee gap makes the release journal unbalanced — rejected at COMMIT. This
 * way `commission + net === principal` holds by construction, for any rate.
 *
 * Rounding is half-up on the commission (amounts here are non-negative).
 */
export function splitCommission(
  principalNgwee: number,
  ratePercent: number,
): { commission: number; net: number } {
  if (!Number.isInteger(principalNgwee) || principalNgwee < 0) {
    throw new Error(`splitCommission expects non-negative whole ngwee, got ${principalNgwee}`);
  }
  if (!(ratePercent >= 0) || ratePercent > 100) {
    throw new Error(`Invalid commission rate: ${ratePercent}`);
  }
  // Scale the rate to an integer basis-point-like factor before dividing, so a
  // rate such as 2.5% doesn't drag the principal through float multiplication.
  const rateBasis = Math.round(ratePercent * 100); // percent → hundredths of a percent
  const commission = Math.round((principalNgwee * rateBasis) / 10_000);
  return { commission, net: principalNgwee - commission };
}

/** Sum a list of ngwee amounts, guarding against accidental float inputs. */
export function sumNgwee(values: number[]): number {
  return values.reduce((acc, v) => {
    if (!Number.isInteger(v)) {
      throw new Error(`sumNgwee expects whole ngwee, got ${v}`);
    }
    return acc + v;
  }, 0);
}
