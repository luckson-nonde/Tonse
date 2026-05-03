import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { Category } from '../../categories/entities/category.entity';

/**
 * Junction row between an inquiry and a category. Composite PK so
 * (inquiryId, categoryId) is naturally unique. Replaces the comma-
 * joined `inquiry.category` string blob — every category is now its
 * own row, queryable by exact id.
 */
@Entity('inquiry_categories')
@Index('idx_inquiry_categories_category', ['categoryId'])
export class InquiryCategory {
  @PrimaryColumn({ type: 'uuid' })
  inquiryId: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  categoryId: string;

  @ManyToOne(() => Inquiry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inquiryId' })
  inquiry: Inquiry;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
