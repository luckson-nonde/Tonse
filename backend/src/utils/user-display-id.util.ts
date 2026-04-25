import { createHash } from 'crypto';

/**
 * User Display ID Utility
 * Generates and validates user-friendly display IDs from system UUIDs
 * Format: USER-XXXXXX (where X is alphanumeric)
 *
 * Example: USER-A3K9F2
 */
export class UserDisplayIdUtil {
  private static readonly PREFIX = 'USER';
  private static readonly SEPARATOR = '-';
  private static readonly HASH_LENGTH = 6;
  private static readonly ALLOWED_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  /**
   * Generate a deterministic display ID from a UUID
   * Same UUID will always produce the same display ID
   *
   * @param uuid - System UUID
   * @returns Display ID in format USER-XXXXXX
   */
  static generateDisplayId(uuid: string): string {
    const hash = createHash('sha256').update(uuid).digest('hex');
    const numericHash = parseInt(hash.slice(0, 8), 16);
    const displayIdNumber = Math.abs(numericHash) % Math.pow(36, this.HASH_LENGTH);

    const displayIdChars = displayIdNumber
      .toString(36)
      .toUpperCase()
      .padStart(this.HASH_LENGTH, '0');

    return `${this.PREFIX}${this.SEPARATOR}${displayIdChars}`;
  }

  /**
   * Validate a display ID format
   *
   * @param displayId - Display ID to validate
   * @returns True if valid format
   */
  static isValidDisplayId(displayId: string): boolean {
    const regex = new RegExp(`^${this.PREFIX}${this.SEPARATOR}[A-Z0-9]{${this.HASH_LENGTH}}$`);
    return regex.test(displayId);
  }

  /**
   * Extract the hash portion from a display ID
   *
   * @param displayId - Display ID (USER-XXXXXX)
   * @returns Hash portion (XXXXXX)
   */
  static extractHash(displayId: string): string {
    if (!this.isValidDisplayId(displayId)) {
      throw new Error(`Invalid display ID format: ${displayId}`);
    }
    return displayId.split(this.SEPARATOR)[1];
  }

  /**
   * Format a string for display ID (uppercase, alphanumeric)
   * Used when validating NRC or other identifiers
   *
   * @param value - Value to format
   * @returns Formatted string
   */
  static normalizeIdentifier(value: string): string {
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 50);
  }
}
