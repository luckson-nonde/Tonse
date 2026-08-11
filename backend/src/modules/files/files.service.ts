import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import * as path from 'path';
import type { Multer } from 'multer';
import { encryptBuffer, decryptBuffer } from '../../common/crypto/pii-crypto';
import {
  STORAGE_DRIVER,
  StorageDriver,
  storageKeyFromUrl,
} from '../storage/storage-driver.interface';

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
  // Job-board application evidence (trade certificates, licences, permits a
  // job poster asked for). Never world-readable: a worker's credentials are
  // theirs, shared with the poster they applied to — not the open internet.
  'job-application',
]);

/** Phone-camera video containers accepted for job evidence (Android emits
 *  mp4/3gp, iPhone emits QuickTime .mov). */
const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
]);

@Injectable()
export class FilesService {
  /**
   * Storage is injected, not chosen here: a mounted disk on Render, object
   * storage on a platform without one (see storage.module.ts). This service
   * still owns the POLICY — what may be uploaded, what counts as sensitive,
   * and what gets encrypted — while the driver owns only where bytes land.
   */
  constructor(@Inject(STORAGE_DRIVER) private readonly storage: StorageDriver) {}

  static isSensitiveCategory(category: string): boolean {
    return SENSITIVE_CATEGORIES.has(category);
  }

  /**
   * Save uploaded file and return its URL
   */
  async uploadFile(file: Express.Multer.File, category: string = 'general'): Promise<string> {
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
    // certificates and terms are usually PDFs, not photos. `job-evidence`
    // (technician before/after capture) additionally accepts short phone
    // videos — the only category that does.
    const isSensitive = FilesService.isSensitiveCategory(category);
    // job-evidence (technician before/after capture) and ad-media (seller ad
    // placements) are the only categories that accept short phone/ad videos.
    const acceptsVideo = category === 'job-evidence' || category === 'ad-media';
    const isVideo = VIDEO_MIMES.has(file.mimetype);
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      ...(isSensitive ? ['application/pdf'] : []),
      ...(acceptsVideo ? [...VIDEO_MIMES] : []),
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        isSensitive
          ? 'Only image or PDF files are allowed (JPEG, PNG, WebP, GIF, PDF)'
          : acceptsVideo
            ? 'Only images or short videos are allowed (JPEG, PNG, WebP, GIF, MP4, WebM, MOV, 3GP)'
            : 'Only image files are allowed (JPEG, PNG, WebP, GIF)',
      );
    }

    // Validate file size (40MB for evidence videos, 25MB for ad videos,
    // 10MB for documents, 5MB for images).
    const maxMb = isVideo && category === 'job-evidence' ? 40 : isVideo && category === 'ad-media' ? 25 : isSensitive ? 10 : 5;
    const maxSize = maxMb * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`File size must not exceed ${maxMb}MB`);
    }

    // Generate a unique key. Same shape as the old filename, because it IS the
    // old filename: on the filesystem driver these keys land in exactly the
    // directories they always did, so existing rows keep resolving.
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const key = `${category}-${timestamp}-${random}${ext}`;

    // SENSITIVE: encrypted BEFORE it reaches storage, and written to the secure
    // class — never world-readable, served only via the authenticated
    // /files/secure endpoint. The encryption happening here rather than in a
    // driver is deliberate: it must hold no matter which driver is active, so
    // object storage only ever receives ciphertext for these categories.
    if (FilesService.isSensitiveCategory(category)) {
      return this.storage.put(key, encryptBuffer(file.buffer), {
        storageClass: 'secure',
        contentType: file.mimetype,
      });
    }

    // Non-sensitive: world-readable (logos, product/reference images).
    return this.storage.put(key, file.buffer, {
      storageClass: 'public',
      contentType: file.mimetype,
    });
  }

  /** Read + decrypt a secure file for the authenticated serve endpoint. */
  async readSecureFile(filename: string): Promise<{ data: Buffer; contentType: string }> {
    // `filename` arrives from a URL parameter. storageKeyFromUrl normalises it
    // and the driver rejects traversal — both matter here, since this is the
    // one path where a client names the object.
    const key = storageKeyFromUrl(filename);
    const raw = await this.storage.get(key, 'secure');
    const data = decryptBuffer(raw);
    const ext = path.extname(key).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
      : ext === '.gif' ? 'image/gif'
      : ext === '.pdf' ? 'application/pdf'
      : 'image/jpeg';
    return { data, contentType };
  }

  /** Delete a secure file (used on account deletion). Accepts URL or filename. */
  async deleteSecureFile(fileUrlOrName: string): Promise<void> {
    try {
      await this.storage.delete(storageKeyFromUrl(fileUrlOrName), 'secure');
    } catch {
      /* best-effort — a failed delete must never block account erasure */
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    category: string = 'general',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Sequential, not Promise.all: uploadFile validates and can reject, and a
    // partial parallel batch would leave orphans behind whichever one failed.
    const urls: string[] = [];
    for (const file of files) {
      urls.push(await this.uploadFile(file, category));
    }
    return urls;
  }

  /**
   * Delete a file
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      await this.storage.delete(storageKeyFromUrl(fileUrl), 'public');
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw - silently fail if the file doesn't exist
    }
  }
}

