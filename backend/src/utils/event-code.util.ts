import * as crypto from 'crypto';

/**
 * Shareable event + ticket codes (EVT-XXXXXX / TIX-XXXXXX).
 *
 * Same deterministic-hash shape as ReferralCodeUtil (REF-): 32-character
 * power-of-two charset so the 5-bit mask maps uniformly, ambiguous glyphs
 * dropped (I/O and digits 0/1) because these codes get typed off posters and
 * read aloud at the door. A salt parameter lets the caller regenerate a
 * different code from the same seed on a unique-constraint collision.
 */
abstract class ShortCodeUtil {
  private static readonly CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  protected static generate(prefix: string, length: number, seed: string, salt = 0): string {
    const clean = seed.replace(/-/g, '');
    const hash = crypto
      .createHash('sha256')
      .update(salt === 0 ? clean : `${clean}:${salt}`)
      .digest('hex');
    return `${prefix}-${this.hashToAlphanumeric(hash, length)}`;
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

  protected static normalize(prefix: string, raw: string): string {
    const cleaned = (raw || '').trim().toUpperCase();
    if (!cleaned) return '';
    return cleaned.startsWith(`${prefix}-`) ? cleaned : `${prefix}-${cleaned}`;
  }
}

/** Public shareable event code — the `:code` in `/e/:code`. */
export class EventCodeUtil extends ShortCodeUtil {
  private static readonly PREFIX = 'EVT';
  private static readonly CODE_LENGTH = 6;

  /** Example: fce43de0-…-c9d70260061e → EVT-8FQ2M3 */
  static generateCode(uuid: string, salt = 0): string {
    return this.generate(this.PREFIX, this.CODE_LENGTH, uuid, salt);
  }

  /** Trim/uppercase and tolerate a missing `EVT-` prefix. */
  static normalizeCode(raw: string): string {
    return this.normalize(this.PREFIX, raw);
  }
}

/** Per-attendee ticket code — one per admitted unit, shown after purchase. */
export class TicketCodeUtil extends ShortCodeUtil {
  private static readonly PREFIX = 'TIX';
  private static readonly CODE_LENGTH = 6;

  /** Seed with `${orderId}:${seq}` so codes are deterministic per order line. */
  static generateCode(seed: string, salt = 0): string {
    return this.generate(this.PREFIX, this.CODE_LENGTH, seed, salt);
  }
}
