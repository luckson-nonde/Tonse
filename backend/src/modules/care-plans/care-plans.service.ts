import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CarePlan, CarePlanTask, CarePlanVisit } from './entities/care-plan.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { PaymentsService } from '../payments/payments.service';
import { CreateCarePlanDto } from './dto/create-care-plan.dto';
import { UpdateCarePlanDto } from './dto/update-care-plan.dto';
import { RenewCarePlanDto } from './dto/renew-care-plan.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
/** One renewal period per plan model — 7 days weekly, 30 days monthly. */
const PERIOD_MS: Record<string, number> = {
  WEEKLY: 7 * DAY_MS,
  MONTHLY: 30 * DAY_MS,
};

/** A plan may be set up as soon as the buyer commits — any status from
 *  acceptance onward except the terminal negatives. */
const PLAN_ELIGIBLE_QUOTE_STATUSES = new Set([
  'ACCEPTED',
  'PAYMENT_PENDING',
  'PAID',
  'PENDING_COLLECTION',
  'AWAITING_PICKUP',
  'COMPLETED',
  'HANDED_OVER',
]);

/** Escrow-holding-ish: money has actually moved for this engagement. */
const PAID_QUOTE_STATUSES = new Set([
  'PAID',
  'PENDING_COLLECTION',
  'AWAITING_PICKUP',
  'COMPLETED',
  'HANDED_OVER',
]);

/** Minimal caller shape — staff resolve to their owner, like quotes' providerScope. */
interface CallerLike {
  id: string;
  parentProviderId?: string | null;
}

@Injectable()
export class CarePlansService {
  constructor(
    @InjectRepository(CarePlan)
    private readonly carePlansRepository: Repository<CarePlan>,
    @InjectRepository(Quote)
    private readonly quotesRepository: Repository<Quote>,
    private readonly paymentsService: PaymentsService,
  ) {}

  private resolveOwnerId(caller: CallerLike): string {
    return caller.parentProviderId ?? caller.id;
  }

  async listForProvider(caller: CallerLike): Promise<CarePlan[]> {
    return this.carePlansRepository.find({
      where: { providerId: this.resolveOwnerId(caller) },
      order: { createdAt: 'DESC' },
    });
  }

  async listForBuyer(caller: CallerLike): Promise<CarePlan[]> {
    return this.carePlansRepository.find({
      where: { buyerId: caller.id },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a plan from a quote the caller sent. Idempotent on quoteId — the
   * "Start care plan" button can be pressed twice without duplicating a
   * client. Everything is seeded server-side from the quote + inquiry:
   * the client's identity, their stated care needs, the requested services
   * as the initial task list, and the preferred first visit as the first
   * scheduled visit.
   */
  async createFromQuote(caller: CallerLike, dto: CreateCarePlanDto): Promise<CarePlan> {
    const ownerId = this.resolveOwnerId(caller);
    const quote = await this.quotesRepository.findOne({
      where: { id: dto.quoteId },
      relations: ['inquiry', 'inquiry.buyer'],
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.providerId !== ownerId) {
      throw new ForbiddenException('You can only start care plans from your own quotes');
    }
    if (!PLAN_ELIGIBLE_QUOTE_STATUSES.has(quote.status)) {
      throw new BadRequestException(
        'A care plan can only be started once the client has accepted your quote',
      );
    }

    const existing = await this.carePlansRepository.findOne({ where: { quoteId: quote.id } });
    if (existing) return existing;

    const attrs = quote.inquiry?.attributes ?? {};
    const dynamic = quote.dynamicFields ?? {};
    const termsSource = String(dynamic.paymentTerms ?? attrs.paymentModel ?? '');
    const paymentModel: CarePlan['paymentModel'] = /month/i.test(termsSource)
      ? 'MONTHLY'
      : /week/i.test(termsSource)
        ? 'WEEKLY'
        : 'PER_VISIT';

    const clientName =
      (quote.buyerContact?.name as string | undefined) ||
      quote.inquiry?.buyer?.name ||
      'Client';

    // The services the buyer ticked become the opening task list.
    const tasks: CarePlanTask[] = Array.isArray(attrs.careServices)
      ? attrs.careServices
          .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((title: string) => ({ id: randomUUID(), title }))
      : [];

    // The buyer's preferred first visit becomes the first scheduled visit.
    const visits: CarePlanVisit[] = [];
    const preferred = attrs.preferredDateTime ? new Date(attrs.preferredDateTime) : null;
    if (preferred && !Number.isNaN(preferred.getTime())) {
      visits.push({
        id: randomUUID(),
        date: preferred.toISOString().slice(0, 10),
        startTime: preferred.toISOString().slice(11, 16),
        status: 'SCHEDULED',
        notes: 'First visit — requested by the client',
      });
    }

    const paidUntil =
      PERIOD_MS[paymentModel] && PAID_QUOTE_STATUSES.has(quote.status)
        ? new Date(Date.now() + PERIOD_MS[paymentModel])
        : null;

    return this.carePlansRepository.save(
      this.carePlansRepository.create({
        providerId: ownerId,
        buyerId: quote.inquiry?.buyerId ?? quote.buyerContact?.buyerId,
        quoteId: quote.id,
        clientName,
        careNeeds: attrs,
        tasks,
        visits,
        paymentModel,
        rate: quote.price,
        paymentMethod:
          typeof dynamic.paymentMethod === 'string' ? dynamic.paymentMethod.slice(0, 50) : null,
        paidUntil,
        status: 'ACTIVE',
        notes: null,
      }),
    );
  }

  async update(caller: CallerLike, id: string, dto: UpdateCarePlanDto): Promise<CarePlan> {
    const plan = await this.findOwned(caller, id);
    if (dto.clientName !== undefined) plan.clientName = dto.clientName;
    if (dto.careNeeds !== undefined) plan.careNeeds = JSON.parse(dto.careNeeds);
    if (dto.tasks !== undefined) plan.tasks = dto.tasks;
    if (dto.visits !== undefined) plan.visits = dto.visits;
    if (dto.paymentModel !== undefined) plan.paymentModel = dto.paymentModel;
    if (dto.rate !== undefined) plan.rate = dto.rate;
    if (dto.paymentMethod !== undefined) plan.paymentMethod = dto.paymentMethod;
    if (dto.status !== undefined) plan.status = dto.status;
    if (dto.notes !== undefined) plan.notes = dto.notes;
    return this.carePlansRepository.save(plan);
  }

  /**
   * Simulated period renewal, mirroring BillingService.paySubscription:
   * extends paidUntil from max(now, current paidUntil) by one period (7 days
   * for WEEKLY, 30 for MONTHLY) and writes a payments row so the money is
   * visible in the admin Financial tab. No real PSP call — payment UX is
   * deliberately simulated in this codebase.
   */
  async renew(caller: CallerLike, id: string, dto: RenewCarePlanDto): Promise<CarePlan> {
    const plan = await this.findOwned(caller, id);
    const period = PERIOD_MS[plan.paymentModel];
    if (!period) {
      throw new BadRequestException('Only weekly or monthly care plans can be renewed');
    }

    const extendFrom =
      plan.paidUntil && plan.paidUntil.getTime() > Date.now()
        ? plan.paidUntil.getTime()
        : Date.now();
    plan.paidUntil = new Date(extendFrom + period);
    const saved = await this.carePlansRepository.save(plan);

    const amount = Number(plan.rate ?? 0);
    if (amount > 0) {
      await this.paymentsService.create({
        userId: plan.buyerId,
        type: 'PAYMENT',
        amount,
        status: 'SUCCESS',
        paymentMethod: dto.method ?? 'MOBILE_MONEY',
        description:
          plan.paymentModel === 'WEEKLY'
            ? 'Home care weekly plan renewal'
            : 'Home care monthly plan renewal',
        metadata: {
          kind: 'CARE_PLAN_RENEWAL',
          carePlanId: plan.id,
          providerId: plan.providerId,
          recordedByUserId: caller.id,
        },
        processedAt: new Date(),
      });
    }
    return saved;
  }

  private async findOwned(caller: CallerLike, id: string): Promise<CarePlan> {
    const plan = await this.carePlansRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Care plan not found');
    if (plan.providerId !== this.resolveOwnerId(caller)) {
      throw new ForbiddenException('This care plan belongs to another provider');
    }
    return plan;
  }
}
