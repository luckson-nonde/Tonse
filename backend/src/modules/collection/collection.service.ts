import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { PaymentsService } from '../payments/payments.service';
import { ESCROW_HOLDING_STATUSES } from '../quotes/quote-status';

/**
 * Quotes that still need a physical handover — i.e. the buyer's money is still
 * in escrow. Shared with the account-deletion escrow check; this list used to
 * omit PENDING_COLLECTION while that one included it, so such a quote blocked
 * the buyer's deletion yet never showed in this queue — escrow that could never
 * be released. One list now (see quotes/quote-status.ts).
 */
const COLLECTIBLE_STATUSES = [...ESCROW_HOLDING_STATUSES];

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
    private readonly dataSource: DataSource,
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

  /**
   * Handover confirmed → mark completed and release escrow to the shop.
   *
   * ATOMIC: the status flip and the money record commit together or not at all.
   * Previously the COMPLETED write landed first and a failed release was merely
   * logged — leaving the quote discharged from escrow with NO payment record,
   * and (because `externalReference` is uniquely indexed) unrepairable by retry.
   * Money silently vanished from both escrow and the ledger. Now a failure rolls
   * the status back too, so the parcel stays in the queue and a retry works.
   *
   * The row is locked FOR UPDATE and the status re-checked inside the
   * transaction, so two concurrent completes can only release once.
   */
  async complete(providerId: string, quoteId: string): Promise<Quote> {
    await this.getOwned(quoteId, providerId);

    await this.dataSource.transaction(async (m) => {
      const [locked]: Quote[] = await m.query(
        'SELECT * FROM quotes WHERE id = $1 FOR UPDATE',
        [quoteId],
      );
      if (!locked) throw new NotFoundException('Parcel not found');
      if (locked.status === 'COMPLETED') return; // idempotent — never double-release

      await m.getRepository(Quote).update(quoteId, { status: 'COMPLETED' });

      // Server-authoritative escrow release: credit the shop (owner) account.
      // Enlisted in THIS transaction (`m`), so the release record and the
      // COMPLETED status commit together or roll back together. Any failure
      // here (incl. the unique `externalReference` guard against a double
      // release) rolls the status back with it.
      await this.payments.create(
        {
          userId: providerId,
          type: 'TRANSFER',
          amount: Number(locked.price) || 0,
          fee: 0,
          status: 'SUCCESS',
          description: `Escrow release for collected parcel ${quoteId}`,
          externalReference: `ESCROW-${quoteId}`,
        } as any,
        m,
      );
    });

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
