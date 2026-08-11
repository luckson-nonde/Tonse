import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InquiryImage } from '../entities/inquiry-image.entity';
import { Inquiry } from '../entities/inquiry.entity';

import sharp from 'sharp';
import {
  STORAGE_DRIVER,
  StorageDriver,
  storageKeyFromUrl,
} from '../../storage/storage-driver.interface';

/**
 * Inquiry Images Service
 * Handles upload, deletion, and management of inquiry reference images
 */
@Injectable()
export class InquiryImagesService {
  /** Key prefix inside the public storage class — the old `uploads/inquiries`
   *  subdirectory, expressed as a key so it works on a disk or in a bucket. */
  private static readonly PREFIX = 'inquiries';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB per image
  private readonly maxImages = 10; // Max images per inquiry
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  constructor(
    @InjectRepository(InquiryImage)
    private readonly inquiryImageRepository: Repository<InquiryImage>,
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @Inject(STORAGE_DRIVER)
    private readonly storage: StorageDriver,
  ) {}

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

    // `.jpg`, not the original extension: processImage always re-encodes to
    // JPEG, so keeping the uploaded name's extension produced files like
    // `1712345678.png` containing JPEG bytes — harmless on a filesystem, but
    // object storage serves a Content-Type derived from the key, so the
    // mismatch would reach browsers as a broken image.
    const key = `${InquiryImagesService.PREFIX}/${inquiryId}/${Date.now()}.jpg`;

    const optimised = await this.processImage(file.buffer);

    const imageUrl = await this.storage.put(key, optimised, {
      storageClass: 'public',
      contentType: 'image/jpeg',
    });

    const inquiryImage = this.inquiryImageRepository.create({
      inquiryId,
      imageUrl,
      // The storage KEY, not a server path — see the entity's comment.
      imagePath: key,
      // Also the re-encoded type, not the upload's: what we stored is JPEG.
      fileType: 'image/jpeg',
      fileSize: optimised.length,
      orderIndex: existingImages,
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

    await this.deleteStoredImage(image);

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
      await this.deleteStoredImage(image);
    }

    await this.inquiryImageRepository.remove(images);
  }

  /**
   * Remove the stored object behind a row, best-effort.
   *
   * Falls back from `imagePath` to `imageUrl` and normalises both through
   * `storageKeyFromUrl`, because rows predating object storage hold an
   * absolute server path in `imagePath` while new ones hold a key. A failure
   * must never block the database delete — an orphaned object is recoverable,
   * a row pointing at nothing is not.
   */
  private async deleteStoredImage(image: InquiryImage): Promise<void> {
    const key = storageKeyFromUrl(image.imagePath || image.imageUrl || '');
    if (!key) return;
    try {
      await this.storage.delete(key, 'public');
    } catch (error) {
      console.error(`Failed to delete stored image ${key}`, error);
    }
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
   * Resize and re-encode to JPEG, returning bytes.
   *
   * Returns a buffer rather than writing a file so the result can go to either
   * storage backend — sharp's `toFile` assumes a writable disk, which is the
   * assumption this whole refactor removes.
   */
  private async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      const maxWidth = 1920;
      const maxHeight = 1440;

      return await sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat('jpeg', { quality: 85 })
        .toBuffer();
    } catch (error) {
      throw new BadRequestException(`Failed to process image: ${(error as any)?.message || 'Unknown error'}`);
    }
  }
}



