import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Inquiry } from './inquiry.entity';

@Entity('inquiry_images')
export class InquiryImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inquiryId: string;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inquiryId' })
  inquiry: Inquiry;

  /** Browser-facing URL. `/uploads/...` on the filesystem driver, an absolute
   *  CDN URL on object storage — so never parse it, resolve it. */
  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  /**
   * STORAGE KEY, e.g. `inquiries/<inquiryId>/1712345678.jpg`.
   *
   * Historically this held an ABSOLUTE server path, which only ever made sense
   * on a machine with a disk. Rows written before object storage still contain
   * those paths, so every read goes through `storageKeyFromUrl()`, which
   * reduces both shapes to the same key. Don't assume either form.
   */
  @Column({ type: 'varchar', length: 500 })
  imagePath: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fileType: string; // MIME type (image/jpeg, image/png, etc.)

  @Column({ type: 'integer', nullable: true })
  fileSize: number; // File size in bytes

  @Column({ type: 'integer', default: 0 })
  orderIndex: number; // Display order of images

  @CreateDateColumn()
  uploadedAt: Date;
}
