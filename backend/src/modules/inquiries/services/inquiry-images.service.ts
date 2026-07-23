import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InquiryImage } from '../entities/inquiry-image.entity';
import { Inquiry } from '../entities/inquiry.entity';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { getUploadsDir } from '../../../config/storage.config';

/**
 * Inquiry Images Service
 * Handles upload, deletion, and management of inquiry reference images
 */
@Injectable()
export class InquiryImagesService {
  // Shares the configured uploads root so inquiry photos land on the same
  // persistent disk as every other public upload (see storage.config.ts).
  private readonly uploadsDir = path.join(getUploadsDir(), 'inquiries');
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB per image
  private readonly maxImages = 10; // Max images per inquiry
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  constructor(
    @InjectRepository(InquiryImage)
    private readonly inquiryImageRepository: Repository<InquiryImage>,
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>
  ) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Upload image for an inquiry
   * @param inquiryId - Inquiry ID
   * @param file - Multer file object
   * @returns Created InquiryImage entity
   */
  async uploadImage(inquiryId: string, file: Express.Multer.File): Promise<InquiryImage> {
    // Verify inquiry exists
    const inquiry = await this.inquiryRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID ${inquiryId} not found`);
    }

    // Validate file
    this.validateFile(file);

    // Check max images per inquiry
    const existingImages = await this.inquiryImageRepository.count({
      where: { inquiryId },
    });
    if (existingImages >= this.maxImages) {
      throw new BadRequestException(`Maximum ${this.maxImages} images per inquiry allowed`);
    }

    // Create inquiry folder if not exists
    const inquiryFolder = path.join(this.uploadsDir, inquiryId);
    if (!fs.existsSync(inquiryFolder)) {
      fs.mkdirSync(inquiryFolder, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${timestamp}${fileExtension}`;
    const filePath = path.join(inquiryFolder, fileName);

    // Process image (optimize before saving)
    await this.processImage(file.buffer, filePath);

    // Get file stats
    const fileStats = fs.statSync(filePath);

    // Create database record
    const imageUrl = `/uploads/inquiries/${inquiryId}/${fileName}`;
    const nextOrderIndex = existingImages;

    const inquiryImage = this.inquiryImageRepository.create({
      inquiryId,
      imageUrl,
      imagePath: filePath,
      fileType: file.mimetype,
      fileSize: fileStats.size,
      orderIndex: nextOrderIndex,
    });

    return await this.inquiryImageRepository.save(inquiryImage);
  }

  /**
   * Upload multiple images for an inquiry
   * @param inquiryId - Inquiry ID
   * @param files - Array of Multer file objects
   * @returns Array of created InquiryImage entities
   */
  async uploadMultipleImages(
    inquiryId: string,
    files: Express.Multer.File[]
  ): Promise<InquiryImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results: InquiryImage[] = [];
    for (const file of files) {
      try {
        const image = await this.uploadImage(inquiryId, file);
        results.push(image);
      } catch (error) {
        // Continue with next file, but log the error
        console.error(`Failed to upload image for inquiry ${inquiryId}:`, (error as any)?.message || 'Unknown error');
      }
    }

    if (results.length === 0) {
      throw new BadRequestException('All uploads failed. Please check file formats and sizes.');
    }

    return results;
  }

  /**
   * Get all images for an inquiry
   * @param inquiryId - Inquiry ID
   * @returns Array of InquiryImage entities
   */
  async getInquiryImages(inquiryId: string): Promise<InquiryImage[]> {
    const inquiry = await this.inquiryRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID ${inquiryId} not found`);
    }

    return await this.inquiryImageRepository.find({
      where: { inquiryId },
      order: { orderIndex: 'ASC' },
    });
  }

  /**
   * Delete an image from an inquiry
   * @param inquiryId - Inquiry ID
   * @param imageId - Image ID
   */
  async deleteImage(inquiryId: string, imageId: string): Promise<void> {
    const image = await this.inquiryImageRepository.findOne({
      where: { id: imageId, inquiryId },
    });

    if (!image) {
      throw new NotFoundException(`Image not found`);
    }

    // Delete file from disk
    try {
      if (fs.existsSync(image.imagePath)) {
        fs.unlinkSync(image.imagePath);
      }
    } catch (error) {
      console.error(`Failed to delete file: ${image.imagePath}`, error);
    }

    // Delete database record
    await this.inquiryImageRepository.remove(image);

    // Reorder remaining images
    await this.reorderImages(inquiryId);
  }

  /**
   * Delete all images from an inquiry
   * @param inquiryId - Inquiry ID
   */
  async deleteAllImages(inquiryId: string): Promise<void> {
    const images = await this.inquiryImageRepository.find({
      where: { inquiryId },
    });

    for (const image of images) {
      try {
        if (fs.existsSync(image.imagePath)) {
          fs.unlinkSync(image.imagePath);
        }
      } catch (error) {
        console.error(`Failed to delete file: ${image.imagePath}`, error);
      }
    }

    await this.inquiryImageRepository.remove(images);
  }

  /**
   * Reorder images after deletion
   * @param inquiryId - Inquiry ID
   */
  private async reorderImages(inquiryId: string): Promise<void> {
    const images = await this.inquiryImageRepository.find({
      where: { inquiryId },
      order: { id: 'ASC' },
    });

    for (let i = 0; i < images.length; i++) {
      images[i].orderIndex = i;
    }

    await this.inquiryImageRepository.save(images);
  }

  /**
   * Validate uploaded file
   * @param file - Multer file object
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxFileSize / (1024 * 1024)}MB`
      );
    }
  }

  /**
   * Process image (optimize and save)
   * @param buffer - Image buffer
   * @param filePath - Target file path
   */
  private async processImage(buffer: Buffer, filePath: string): Promise<void> {
    try {
      // Resize and optimize image to max 1920x1440 and convert to webp if original is large
      const maxWidth = 1920;
      const maxHeight = 1440;

      await sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat('jpeg', { quality: 85 })
        .toFile(filePath);
    } catch (error) {
      throw new BadRequestException(`Failed to process image: ${(error as any)?.message || 'Unknown error'}`);
    }
  }
}



