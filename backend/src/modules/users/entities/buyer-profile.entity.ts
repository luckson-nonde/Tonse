import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * BuyerProfile — Phase 3 of the users-table restructure.
 *
 * Holds the buyer-specific data that used to live as columns on the users
 * table (delivery location, interests). Multiple BuyerProfile rows per user
 * are allowed so a user can switch between roles later — the active row is
 * pointed at by users.activeProfileId + users.activeProfileType.
 *
 * The userId FK is intentionally NOT unique — Phase 3 makes role-switching
 * schema-ready (a single user can carry a buyer_profiles row AND a
 * seller_profiles row simultaneously, switching which is "active").
 */
@Entity('buyer_profiles')
@Index('idx_buyer_profiles_user', ['userId'])
export class BuyerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Delivery / preferred-area location. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number;

  /** Buyer interest categories — what they typically source. */
  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  /** Sub-shape: INDIVIDUAL_BUYER vs COMPANY_BUYER (and the COMPANY_* roles). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subRole: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
