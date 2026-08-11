import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { BillingSettings, QuoteTier } from './entities/billing-settings.entity';
import { ShopSubscription } from './entities/shop-subscription.entity';
import { PaymentsService } from '../payments/payments.service';
import { UpdateBillingSettingsDto } from './dto/update-billing-settings.dto';
import { PaySubscriptionDto } from './dto/pay-subscription.dto';

/** Seeds the settings row — same 8 tiers InquiryPreferences.tsx hardcoded before. */
const DEFAULT_TIERS: QuoteTier[] = [
  { count: 5, price: 10 },
  { count: 10, price: 15 },
  { count: 20, price: 20 },
  { count: 30, price: 25 },
  { count: 40, price: 30 },
  { count: 50, price: 35 },
  { count: 60, price: 40 },
  { count: 70, price: 45 },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Minimal caller shape — staff resolve to their owner, like quotes' providerScope. */
interface CallerLike {
  id: string;
  parentProviderId?: string | null;
}

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingSettings)
    private readonly settingsRepository: Repository<BillingSettings>,
    @InjectRepository(ShopSubscription)
    private readonly subscriptionsRepository: Repository<ShopSubscription>,
    private readonly paymentsService: PaymentsService,
  ) {}

  /** Subscriptions belong to the shop OWNER; staff act on the owner's row. */
  private resolveOwnerId(caller: CallerLike): string {
    return caller.parentProviderId ?? caller.id;
  }

  async getOrCreateSettings(): Promise<BillingSettings> {
    const existing = await this.settingsRepository.find({ take: 1 });
    if (existing.length > 0) return existing[0];
    return this.settingsRepository.save(
      this.settingsRepository.create({
        subscriptionsEnabled: false,
        quoteTiers: DEFAULT_TIERS,
        targetedInquiryFee: 10,
        monthlyFee: 100,
        jobPostingFeeEnabled: false,
        jobPostingFee: 50,
      }),
    );
  }

  /** Shape every authenticated role reads — decimals coerced (pg returns strings). */
  async getSettingsPublic() {
    const settings = await this.getOrCreateSettings();
    return {
      subscriptionsEnabled: settings.subscriptionsEnabled,
      quoteTiers: settings.quoteTiers?.length ? settings.quoteTiers : DEFAULT_TIERS,
      targetedInquiryFee: Number(settings.targetedInquiryFee),
      monthlyFee: Number(settings.monthlyFee),
      jobPostingFeeEnabled: settings.jobPostingFeeEnabled,
      jobPostingFee: Number(settings.jobPostingFee),
    };
  }

  /** The fee a new job posting owes right now, or null when posting is free. */
  async getActiveJobPostingFee(): Promise<number | null> {
    const settings = await this.getOrCreateSettings();
    const fee = Number(settings.jobPostingFee);
    return settings.jobPostingFeeEnabled && fee > 0 ? fee : null;
  }

  async updateSettings(dto: UpdateBillingSettingsDto): Promise<BillingSettings> {
    const settings = await this.getOrCreateSettings();
    if (dto.subscriptionsEnabled !== undefined) settings.subscriptionsEnabled = dto.subscriptionsEnabled;
    if (dto.quoteTiers !== undefined) settings.quoteTiers = dto.quoteTiers;
    if (dto.targetedInquiryFee !== undefined) settings.targetedInquiryFee = dto.targetedInquiryFee;
    if (dto.monthlyFee !== undefined) settings.monthlyFee = dto.monthlyFee;
    if (dto.jobPostingFeeEnabled !== undefined) settings.jobPostingFeeEnabled = dto.jobPostingFeeEnabled;
    if (dto.jobPostingFee !== undefined) settings.jobPostingFee = dto.jobPostingFee;
    return this.settingsRepository.save(settings);
  }

  async countActiveSubscribers(): Promise<number> {
    return this.subscriptionsRepository.count({
      where: { paidUntil: MoreThan(new Date()) },
    });
  }

  async getMySubscriptionStatus(caller: CallerLike) {
    const settings = await this.getOrCreateSettings();
    const ownerId = this.resolveOwnerId(caller);
    const subscription = await this.subscriptionsRepository.findOne({ where: { userId: ownerId } });
    const active = !!subscription?.paidUntil && subscription.paidUntil.getTime() > Date.now();
    return {
      enabled: settings.subscriptionsEnabled,
      active,
      paidUntil: subscription?.paidUntil ?? null,
      monthlyFee: Number(settings.monthlyFee),
    };
  }

  /**
   * Simulated renewal: extends paidUntil from max(now, current paidUntil) by
   * 30 days and writes a payments ledger row so the admin Financial tab sees
   * it. The charge is always the CURRENT monthlyFee — dto.amount is ignored.
   */
  async paySubscription(caller: CallerLike, dto: PaySubscriptionDto) {
    const settings = await this.getOrCreateSettings();
    const ownerId = this.resolveOwnerId(caller);
    const amount = Number(settings.monthlyFee);

    let subscription = await this.subscriptionsRepository.findOne({ where: { userId: ownerId } });
    const extendFrom =
      subscription?.paidUntil && subscription.paidUntil.getTime() > Date.now()
        ? subscription.paidUntil.getTime()
        : Date.now();
    const paidUntil = new Date(extendFrom + THIRTY_DAYS_MS);

    if (subscription) {
      subscription.paidUntil = paidUntil;
      subscription.lastAmount = amount;
    } else {
      subscription = this.subscriptionsRepository.create({ userId: ownerId, paidUntil, lastAmount: amount });
    }
    await this.subscriptionsRepository.save(subscription);

    await this.paymentsService.create({
      userId: ownerId,
      type: 'PAYMENT',
      amount,
      status: 'SUCCESS',
      paymentMethod: dto.method,
      description: 'Monthly shop subscription fee',
      metadata: { kind: 'SHOP_SUBSCRIPTION', ownerId, paidByUserId: caller.id },
      processedAt: new Date(),
    });

    return this.getMySubscriptionStatus(caller);
  }
}
