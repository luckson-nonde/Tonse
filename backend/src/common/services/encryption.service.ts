import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Not currently used anywhere in the app (grep confirms zero other
 * importers) — kept correct rather than deleted, since it's the natural
 * place to encrypt columns like the NRC document path if that's ever
 * needed. Previously derived a single IV once in the constructor and
 * reused it for every encrypt() call — an AES-CBC IV-reuse bug that leaks
 * equality of plaintext prefixes across ciphertexts. Now generates a fresh
 * random IV per call and prefixes it to the ciphertext, which is the
 * standard, safe pattern.
 */
@Injectable()
export class EncryptionService {
  private algorithm: string;
  private key: Buffer;

  constructor(private configService: ConfigService) {
    this.algorithm = this.configService.get('encryption.algorithm');
    // Ensure key is exactly 32 bytes for aes-256-cbc. ENCRYPTION_IV is no
    // longer read here — a per-call random IV (below) replaces it.
    const keyString = this.configService.get('encryption.key');
    this.key = crypto.scryptSync(keyString, 'salt', 32);
  }

  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Encryption failed: ${errorMessage}`);
    }
  }

  decrypt(data: string): string {
    try {
      const [ivHex, encrypted] = data.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Malformed ciphertext (expected "iv:ciphertext")');
      }
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(ivHex, 'hex'),
      );
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }
}
