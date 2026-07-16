import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Multer } from 'multer';
import { encryptBuffer, decryptBuffer } from '../../common/crypto/pii-crypto';

/**
 * Categories whose uploads are SENSITIVE PII (identity + financial documents).
 * These are AES-256-GCM encrypted at rest in a NON-public directory and served
 * only through the authenticated `GET /files/secure/:filename` endpoint — never
 * from the world-readable `public/uploads` static path.
 */
const SENSITIVE_CATEGORIES = new Set([
  'kyc',
  'nrc',
  'payslip',
  'bank-statement',
  'licence',
  'collateral',
  'verification',
  // Lender loan Terms & Conditions documents — encrypted at rest, served only
  // to authenticated parties (the borrower reviewing an offer).
  'loan-terms',
]);

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads');
  // Outside public/ so it is never served statically; only the auth endpoint reads it.
  private readonly secureDir = path.join(process.cwd(), 'secure-uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.secureDir)) {
      fs.mkdirSync(this.secureDir, { recursive: true });
    }
  }

  static isSensitiveCategory(category: string): boolean {
    return SENSITIVE_CATEGORIES.has(category);
  }

  /**
   * Save uploaded file and return its URL
   */
  uploadFile(file: Express.Multer.File, category: string = 'general'): string {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    console.log('Uploading file:', {
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
    });

    // Validate file type. Public images stay images-only; SENSITIVE document
    // categories (KYC, licence, loan T&Cs…) also accept PDF, since real-world
    // certificates and terms are usually PDFs, not photos.
    const isSensitive = FilesService.isSensitiveCategory(category);
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      ...(isSensitive ? ['application/pdf'] : []),
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        isSensitive
          ? 'Only image or PDF files are allowed (JPEG, PNG, WebP, GIF, PDF)'
          : 'Only image files are allowed (JPEG, PNG, WebP, GIF)',
      );
    }

    // Validate file size (max 10MB for documents, 5MB for images)
    const maxSize = (isSensitive ? 10 : 5) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size must not exceed ${isSensitive ? 10 : 5}MB`,
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const filename = `${category}-${timestamp}-${random}${ext}`;

    // SENSITIVE: encrypt at rest and store OUTSIDE public/, served only via the
    // authenticated /files/secure endpoint.
    if (FilesService.isSensitiveCategory(category)) {
      const filepath = path.join(this.secureDir, filename);
      fs.writeFileSync(filepath, encryptBuffer(file.buffer));
      return `/files/secure/${filename}`;
    }

    // Non-sensitive: public static file (logos, product/reference images).
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);
    return `/uploads/${filename}`;
  }

  /** Read + decrypt a secure file for the authenticated serve endpoint. */
  readSecureFile(filename: string): { data: Buffer; contentType: string } {
    const base = path.basename(filename); // strip any path traversal
    const filepath = path.join(this.secureDir, base);
    if (!filepath.startsWith(this.secureDir) || !fs.existsSync(filepath)) {
      throw new NotFoundException('File not found');
    }
    const data = decryptBuffer(fs.readFileSync(filepath));
    const ext = path.extname(base).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
      : ext === '.gif' ? 'image/gif'
      : ext === '.pdf' ? 'application/pdf'
      : 'image/jpeg';
    return { data, contentType };
  }

  /** Delete a secure file (used on account deletion). Accepts URL or filename. */
  deleteSecureFile(fileUrlOrName: string): void {
    try {
      const base = path.basename(fileUrlOrName);
      const filepath = path.join(this.secureDir, base);
      if (filepath.startsWith(this.secureDir) && fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch {
      /* best-effort */
    }
  }

  /**
   * Upload multiple files
   */
  uploadMultipleFiles(files: Express.Multer.File[], category: string = 'general'): string[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return files.map((file) => this.uploadFile(file, category));
  }

  /**
   * Delete a file
   */
  deleteFile(fileUrl: string): void {
    try {
      const filename = path.basename(fileUrl);
      const filepath = path.join(this.uploadDir, filename);

      // Security: ensure filepath is within upload directory
      if (!filepath.startsWith(this.uploadDir)) {
        throw new BadRequestException('Invalid file path');
      }

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw - silently fail if file doesn't exist
    }
  }
}

