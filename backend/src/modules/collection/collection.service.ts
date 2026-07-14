import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { PaymentsService } from '../payments/payments.service';

/** Quotes that still need a physical handover. */
const COLLECTIBLE_STATUSES = ['PAID', 'AWAITING_PICKUP'];

/**
 * Collection surface — the handover of a paid parcel to the buyer.
 *
 * Every method is scoped to an `effectiveProviderId` (the owner/shop id) that
 * the controller resolves as `parentProviderId ?? id`, so a Collection Officer
 * (staff) acts on the OWNER's quotes without ever being granted access to the
 * generic quote/order endpoints. Ownership is re-checked here defensively.
 */
@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
    private readonly payments: PaymentsService,
  ) {}

  /** Parcels awaiting collection/pickup for this shop. */
  async queue(providerId: string): Promise<Quote[]> {
    return this.quotes.find({
      where: { providerId, status: In(COLLECTIBLE_STATUSES) },
      order: { createdAt: 'DESC' },
    });
  }

  /** Recently completed handovers for this shop. */
  async recent(providerId: string): Promise<Quote[]> {
    return this.quotes.find({
      where: { providerId, status: 'COMPLETED' },
      order: { updatedAt: 'DESC' },
      take: 20,
    });
  }

  /** Find a parcel by its buyer collection code, scoped to this shop. */
  async lookupByCode(providerId: string, code: string): Promise<Quote> {
    const trimmed = (code || '').trim();
    if (!trimmed) throw new NotFoundException('No collection code provided');
    const quote = await this.quotes.findOne({ where: { collectionCode: trimmed } });
    if (!quote) throw new NotFoundException('Parcel not found for that code');
    this.assertOwnership(quote, providerId);
    return quote;
  }

  /** Buyer identity confirmed → mark awaiting pickup. */
  async verify(providerId: string, quoteId: string): Promise<Quote> {
    await this.getOwned(quoteId, providerId);
    await this.quotes.update(quoteId, { status: 'AWAITING_PICKUP' });
    return this.quotes.findOne({ where: { id: quoteId } });
  }

  /** Handover confirmed → mark completed and release escrow to the shop. */
  async complete(providerId: string, quoteId: string): Promise<Quote> {
    const quote = await this.getOwned(quoteId, providerId);
    if (quote.status === 'COMPLETED') {
      return quote; // idempotent — don't double-release escrow
    }

    await this.quotes.update(quoteId, { status: 'COMPLETED' });

    // Server-authoritative escrow release: credit the shop (owner) account.
    // `externalReference` is uniquely indexed, so a retry can't double-post.
    try {
      await this.payments.create({
        userId: providerId,
        type: 'TRANSFER',
        amount: Number(quote.price) || 0,
        fee: 0,
        status: 'SUCCESS',
        description: `Escrow release for collected parcel ${quoteId}`,
        externalReference: `ESCROW-${quoteId}`,
      } as any);
    } catch (e) {
      this.logger.warn(
        `Quote ${quoteId} completed, but escrow-release payment failed: ${(e as Error).message}`,
      );
    }

    this.logger.log(`collection.complete: provider=${providerId} quote=${quoteId}`);
    return this.quotes.findOne({ where: { id: quoteId } });
  }

  private async getOwned(quoteId: string, providerId: string): Promise<Quote> {
    const quote = await this.quotes.findOne({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Quote not found');
    this.assertOwnership(quote, providerId);
    return quote;
  }

  private assertOwnership(quote: Quote, providerId: string) {
    if (quote.providerId !== providerId) {
      throw new ForbiddenException('This parcel does not belong to your shop');
    }
  }
}
