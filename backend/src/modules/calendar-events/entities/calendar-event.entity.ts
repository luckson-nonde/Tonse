import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Personal calendar entries — the generic scheduling module behind the
 * dashboard calendar/timeline and the /schedule page. One row per event a
 * user creates for themselves; always scoped to the owner (userId comes
 * from the JWT, never from the client). Loose uuid column, no FK relation
 * (care_plans convention).
 *
 * category/repeatRule/status are varchar unions rather than Postgres enums
 * so new values never need an ALTER TYPE migration. Recurrence is stored as
 * a rule only — occurrence expansion happens client-side over the visible
 * date window.
 */

export const CALENDAR_EVENT_CATEGORIES = [
  'MEETING',
  'REMINDER',
  'APPOINTMENT',
  'EVENT',
  'PERSONAL',
  'PARCEL_COLLECTION',
  'MAKE_PAYMENT',
  'OTHER',
] as const;

export const CALENDAR_EVENT_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'yellow',
] as const;

export const CALENDAR_EVENT_REPEAT_RULES = [
  'NONE',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
] as const;

export const CALENDAR_EVENT_STATUSES = [
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
] as const;

@Entity('calendar_events')
@Index('idx_calendar_events_user', ['userId'])
@Index('idx_calendar_events_date', ['date'])
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Calendar day of the (base) event, 'YYYY-MM-DD'. */
  @Column({ type: 'date' })
  date: string;

  /** 'HH:MM' 24h, optional for all-day entries. */
  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 30, default: 'OTHER' })
  category: string;

  /** Optional user-picked swatch; null = derive from category. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 10, default: 'NONE' })
  repeatRule: string;

  /** Minutes before startTime to remind; null = no reminder. */
  @Column({ type: 'int', nullable: true })
  reminderOffsetMinutes: number | null;

  @Column({ type: 'varchar', length: 20, default: 'CONFIRMED' })
  status: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
