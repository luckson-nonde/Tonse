import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Multer } from 'multer';

@Injectable()
export class FilesService {
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

    console.log('Uploading file:', {
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
    });

    // Validate file type (images only)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
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
    const ext = path.extname(file.originalname);
    const filename = `${category}-${timestamp}-${random}${ext}`;

    // Save file to disk
    const filepath = path.join(this.uploadDir, filename);
    console.log('Saving file to:', filepath);
    fs.writeFileSync(filepath, file.buffer);

    // Return URL (relative to public folder)
    const fileUrl = `/uploads/${filename}`;
    console.log('File uploaded successfully. URL:', fileUrl);
    return fileUrl;
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

