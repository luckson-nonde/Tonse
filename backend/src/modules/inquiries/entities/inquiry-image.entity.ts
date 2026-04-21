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

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string; // URL for frontend display (e.g., /uploads/inquiries/inquiry-123/img1.jpg)

  @Column({ type: 'varchar', length: 500 })
  imagePath: string; // Local server path

  @Column({ type: 'varchar', length: 50, nullable: true })
  fileType: string; // MIME type (image/jpeg, image/png, etc.)

  @Column({ type: 'integer', nullable: true })
  fileSize: number; // File size in bytes

  @Column({ type: 'integer', default: 0 })
  orderIndex: number; // Display order of images

  @CreateDateColumn()
  uploadedAt: Date;
}
