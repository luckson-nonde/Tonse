import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** A recurring duty on the client's care profile ("what needs to be done"). */
export interface CarePlanTask {
  id: string;
  title: string;
  frequency?: string;
  notes?: string;
  done?: boolean;
}

/** One scheduled home visit. Kept as JSON on the plan — a caregiver has a
 *  handful of clients, so the whole plan (needs + tasks + visits) loads and
 *  saves as one row. */
export interface CarePlanVisit {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  startTime?: string;
  endTime?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  /** Per-visit payment tracking for PER_VISIT plans (simulated, like all
   *  payment UX — see auto-memory "Simulate payments"). */
  paid?: boolean;
  notes?: string;
}

/**
 * Home Care (clinical-services / home-care) engagement between a caregiver
 * (nurse/doctor provider) and a client (buyer), created from a quote the
 * buyer accepted. Powers the provider's "My Clients" dashboard view.
 *
 * Loose uuid columns, no FK relations — same convention as shop_favorites /
 * shop_reviews. The unique index on quoteId makes create-from-quote
 * idempotent (Postgres treats NULLs as distinct, so manual plans stay legal).
 *
 * MONTHLY plans track payment the same way the shop paywall does: a
 * `paidUntil` timestamp extended by an explicit renewal action — deliberately
 * NOT auto-recurring billing (none exists in this stack).
 */
@Entity('care_plans')
export class CarePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_care_plans_provider')
  @Column({ type: 'uuid' })
  providerId: string;

  @Index('idx_care_plans_buyer')
  @Column({ type: 'uuid' })
  buyerId: string;

  @Index('idx_care_plans_quote_unique', { unique: true })
  @Column({ type: 'uuid', nullable: true })
  quoteId: string | null;

  @Column({ type: 'varchar', length: 255 })
  clientName: string;

  /** Snapshot of the buyer's inquiry attributes (careRecipient, careServices,
   *  conditionDetails…), provider-editable afterwards. */
  @Column({ type: 'json', nullable: true })
  careNeeds: Record<string, any> | null;

  @Column({ type: 'json', nullable: true })
  tasks: CarePlanTask[] | null;

  @Column({ type: 'json', nullable: true })
  visits: CarePlanVisit[] | null;

  @Column({ type: 'varchar', length: 20, default: 'PER_VISIT' })
  paymentModel: 'PER_VISIT' | 'WEEKLY' | 'MONTHLY';

  /** ZMW per visit (PER_VISIT) or per month (MONTHLY) — seeded from quote.price. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  rate: number | null;

  /** How the client agreed to pay (e.g. "MTN Mobile Money", "Cash after each
   *  visit") — seeded from the accepted quote's dynamicFields.paymentMethod. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  /** WEEKLY/MONTHLY plans: paid up through this date (renewals extend it). */
  @Column({ type: 'timestamp', nullable: true })
  paidUntil: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
