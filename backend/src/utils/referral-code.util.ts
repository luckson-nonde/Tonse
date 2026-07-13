import * as crypto from 'crypto';

/**
 * Referral Code Utility — public, shareable promoter codes (REF-XXXXXXXX).
 *
 * Same deterministic-hash shape as DisplayIdUtil (QID-) and
 * UserDisplayIdUtil (USER-), with two deliberate differences:
 *
 * 1. 32-character charset (a clean power of two). The older utils mask
 *    5 bits (0-31) against a 36-char charset, which makes indices 32-35
 *    structurally unreachable — a hidden bias. A 32-char set maps the
 *    5-bit mask uniformly.
 * 2. Ambiguous glyphs dropped (I/O, and digits 0/1 which read as O/I).
 *    Referral codes get typed and read aloud by end customers, unlike
 *    QID/USER ids which are mostly displayed. 24 letters + 8 digits = 32.
 *
 * A salt parameter lets the caller regenerate a different code from the
 * same UUID on the (unlikely) unique-constraint collision.
 */
export class ReferralCodeUtil {
  private static readonly CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private static readonly CODE_LENGTH = 8;
  private static readonly PREFIX = 'REF';

  /**
   * Generate a referral code from a UUID (+ optional collision salt).
   * Example: fce43de0-...-c9d70260061e → REF-8FQ2M3K7
   */
  static generateCode(uuid: string, salt = 0): string {
    const cleanUuid = uuid.replace(/-/g, '');
    const hash = crypto
      .createHash('sha256')
      .update(salt === 0 ? cleanUuid : `${cleanUuid}:${salt}`)
      .digest('hex');
    return `${this.PREFIX}-${this.hashToAlphanumeric(hash, this.CODE_LENGTH)}`;
  }

  private static hashToAlphanumeric(hex: string, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const byteIndex = Math.floor((i * 5) / 8);
      const bitOffset = (i * 5) % 8;
      const byte = parseInt(hex.substring(byteIndex * 2, byteIndex * 2 + 2), 16);
      const charIndex = (byte >> bitOffset) & 31;
      result += this.CHARSET[charIndex];
    }
    return result;
  }

  /** True for a well-formed code (after normalizeCode). */
  static isValidCode(code: string): boolean {
    const pattern = new RegExp(`^${this.PREFIX}-[A-Z0-9]{${this.CODE_LENGTH}}$`);
    return pattern.test(code);
  }

  /**
   * Normalize user-supplied input: trim, uppercase, and tolerate a missing
   * `REF-` prefix (people copy the tail of the code more often than not).
   */
  static normalizeCode(raw: string): string {
    const cleaned = (raw || '').trim().toUpperCase();
    if (!cleaned) return '';
    return cleaned.startsWith(`${this.PREFIX}-`) ? cleaned : `${this.PREFIX}-${cleaned}`;
  }
}
