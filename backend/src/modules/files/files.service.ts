import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Multer } from 'multer';

const ALLOWED_CATEGORIES = ['general', 'inquiries', 'quotes'];
const ALLOWED_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads');

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save uploaded file and return its URL
   */
  uploadFile(file: Express.Multer.File, category: string = 'general'): string {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Category is interpolated into the saved filename below, so it must be
    // restricted to a fixed set — an unvalidated value here is a path-traversal
    // write primitive (e.g. category=../../../../somewhere).
    if (!ALLOWED_CATEGORIES.includes(category)) {
      throw new BadRequestException('Invalid category');
    }

    // Validate file type. `file.mimetype` is the client-supplied Content-Type
    // and is not proof of actual file content, but combined with deriving the
    // saved extension from this validated value (never from the attacker-
    // controlled `file.originalname`) it closes off serving e.g. an uploaded
    // .svg/.html as inline, script-executing content.
    const ext = ALLOWED_EXTENSIONS[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Only image files are allowed (JPEG, PNG, WebP, GIF)');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${category}-${timestamp}-${random}${ext}`;

    // Save file to disk
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // Return URL (relative to public folder)
    return `/uploads/${filename}`;
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
      this.logger.error(`Failed to delete file: ${(error as Error).message}`);
      // Don't throw - silently fail if file doesn't exist
    }
  }
}

