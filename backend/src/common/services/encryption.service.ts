import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private algorithm: string;
  private key: Buffer;
  private iv: Buffer;

  constructor(private configService: ConfigService) {
    this.algorithm = this.configService.get('encryption.algorithm');
    // Ensure key is exactly 32 bytes for aes-256-cbc
    const keyString = this.configService.get('encryption.key');
    const ivString = this.configService.get('encryption.iv');

    this.key = crypto.scryptSync(keyString, 'salt', 32);
    this.iv = crypto.scryptSync(ivString, 'salt', 16);
  }

  encrypt(data: string): string {
    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Encryption failed: ${errorMessage}`);
    }
  }

  decrypt(data: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        this.iv,
      );
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }
}
