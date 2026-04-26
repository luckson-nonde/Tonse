import * as crypto from 'crypto';

/**
 * Display ID Utility for generating human-friendly, memorable IDs
 * Uses deterministic hashing to convert UUIDs into short, readable strings
 */
export class DisplayIdUtil {
  private static readonly CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private static readonly DISPLAY_ID_LENGTH = 6;
  private static readonly PREFIX = 'QID';

  /**
   * Generate a display ID from a UUID
   * Example: fce43de0-339c-4706-a2e2-c9d70260061e → QID-8F2D3K
   *
   * @param uuid - The UUID to convert
   * @returns Display ID in format: QID-XXXXXX
   */
  static generateDisplayId(uuid: string): string {
    // Remove hyphens from UUID
    const cleanUuid = uuid.replace(/-/g, '');

    // Create hash using SHA-256
    const hash = crypto.createHash('sha256').update(cleanUuid).digest('hex');

    // Convert hash to alphanumeric characters
    const displayId = this.hashToAlphanumeric(hash, this.DISPLAY_ID_LENGTH);

    return `${this.PREFIX}-${displayId}`;
  }

  /**
   * Convert hex hash to alphanumeric string
   * @param hex - Hex string from hash
   * @param length - Desired output length
   * @returns Alphanumeric string
   */
  private static hashToAlphanumeric(hex: string, length: number): string {
    let result = '';

    for (let i = 0; i < length; i++) {
      // Take 5 bits (0-31) from hash
      const byteIndex = Math.floor((i * 5) / 8);
      const bitOffset = (i * 5) % 8;

      const byte = parseInt(hex.substring(byteIndex * 2, byteIndex * 2 + 2), 16);
      const charIndex = (byte >> bitOffset) & 31;

      result += this.CHARSET[charIndex % this.CHARSET.length];
    }

    return result;
  }

  /**
   * Validate if a string is in valid display ID format
   * @param displayId - String to validate
   * @returns true if valid format
   */
  static isValidDisplayId(displayId: string): boolean {
    const pattern = new RegExp(`^${this.PREFIX}-[A-Z0-9]{${this.DISPLAY_ID_LENGTH}}$`);
    return pattern.test(displayId);
  }

  /**
   * Extract the hash portion from a display ID
   * @param displayId - Display ID (e.g., QID-8F2D3K)
   * @returns Hash portion (e.g., 8F2D3K)
   */
  static extractHash(displayId: string): string {
    return displayId.split('-')[1] || '';
  }
}
