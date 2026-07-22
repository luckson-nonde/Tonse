import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { PspTransaction } from './entities/psp-transaction.entity';
import { WebhookEventRecord } from './entities/webhook-event.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { Order } from '../orders/entities/order.entity';
import { LedgerService } from '../ledger/ledger.service';
import { ACCOUNT } from '../ledger/ledger-accounts';
import { toNgwee } from '../../common/money/money';
import {
  Channel,
  PAYMENT_PROVIDER,
  PaymentProvider,
  WebhookEvent,
} from './providers/payment-provider.interface';

/**
 * Money-in.
 *
 * THE CENTRAL CHANGE: paying is no longer something a client asserts. It used
 * to be that `POST /orders` *was* the payment — a client posted an order and
 * the quote became PAID, with nothing collected, verified or held. Now:
 *
 *   1. `checkout()` reads the amount from the QUOTE server-side (never the
 *      request body), asks the PSP to collect, and parks the quote in
 *      PAYMENT_PENDING. No escrow exists yet — no money has moved.
 *   2. The payer approves on their device.
 *   3. The provider's webhook arrives. We re-verify with the provider (never
 *      trusting the payload), then in ONE transaction post ESCROW_FUNDED, flip
 *      the quote to PAID, create the Order and close the Inquiry.
 *
 * So the ledger and the quote can never disagree, and escrow only ever exists
 * because the PSP confirmed it holds the money.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectRepository(PspTransaction)
    private readonly pspTx: Repository<PspTransaction>,
    @InjectRepository(WebhookEventRecord)
    private readonly webhookEvents: Repository<WebhookEventRecord>,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProvider,
    private readonly ledger: LedgerService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /**
   * Start a collection for a quote. Returns what the payer must do next.
   * The buyer is charged price + PSP fee (fee borne by the payer); only the
   * price reaches the holding account.
   */
  async checkout(
    buyerId: string,
    dto: { quoteId: string; channel?: Channel; phone?: string; operator?: string },
  ): Promise<{
    reference: string;
    status: string;
    amount: string;
    fee: string;
    totalCharged: string;
    instruction?: string;
  }> {
    const quote = await this.dataSource.getRepository(Quote).findOne({
      where: { id: dto.quoteId },
      relations: ['inquiry'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    // Only the buyer on the inquiry may pay for it.
    if (quote.inquiry?.buyerId !== buyerId) {
      throw new BadRequestException('This quote is not yours to pay');
    }
    if (quote.status !== 'ACCEPTED' && quote.status !== 'PENDING') {
      throw new ConflictException(`This quote can't be paid from status ${quote.status}`);
    }
    if ((quote as any).condition === 'LOAN') {
      // Loans settle off-platform — they never enter escrow.
      throw new BadRequestException('Loan offers are not paid through escrow');
    }

    // AMOUNT COMES FROM THE QUOTE, never the client.
    const amount = String(quote.price);
    const bearer = this.config.get<'customer' | 'merchant'>('psp.feeBearer') || 'customer';
    const channel: Channel = dto.channel || 'mobile-money';
    const fees = await this.provider.quoteFees({ amount, channel, bearer });

    const reference = `TSE-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Persist BEFORE the outbound call: the provider can fire its webhook
    // before our HTTP request even returns, and that webhook must find its row.
    await this.pspTx.save(
      this.pspTx.create({
        reference,
        provider: this.provider.name,
        type: 'COLLECTION',
        status: 'PENDING',
        amount: fees.amount,
        feeAmount: fees.fee,
        feeBearer: bearer,
        currency: fees.currency,
        quoteId: quote.id,
        counterpartyId: buyerId,
        payerMsisdn: dto.phone ?? null,
        channel,
        idempotencyKey: `collection:${reference}`,
      } as any),
    );

    let result;
    try {
      result = await this.provider.initiateCollection({
        reference,
        amount: fees.amount,
        currency: fees.currency,
        channel,
        bearer,
        phone: dto.phone,
        operator: dto.operator,
        description: `ProQuote ${quote.inquiryTitle}`.slice(0, 100),
      });
    } catch (e) {
      await this.pspTx.update({ reference }, { status: 'FAILED', lastError: (e as Error).message });
      throw e;
    }

    await this.pspTx.update(
      { reference },
      {
        providerReference: result.providerReference ?? null,
        status:
          result.status === 'successful'
            ? 'SUCCESSFUL'
            : result.status === 'failed'
              ? 'FAILED'
              : result.status === 'pay-offline'
                ? 'PAY_OFFLINE'
                : 'PENDING',
        rawPayload: result.raw ?? null,
      },
    );

    // No money yet — this is explicitly NOT an escrow-holding status.
    if (result.status !== 'failed') {
      await this.dataSource.getRepository(Quote).update(quote.id, { status: 'PAYMENT_PENDING' });
    }

    return {
      reference,
      status: result.status,
      amount: fees.amount,
      fee: fees.fee,
      totalCharged: fees.totalCharged,
      instruction: result.instruction,
    };
  }

  /**
   * Handle a verified webhook event. Idempotent twice over: the
   * (provider, eventId) unique index rejects a redelivery, and the journal's
   * own idempotency key rejects a double-post.
   */
  async handleWebhook(event: WebhookEvent): Promise<{ handled: boolean; reason?: string }> {
    try {
      await this.webhookEvents.insert({
        provider: this.provider.name,
        eventId: String(event.eventId),
        type: event.type,
        reference: event.reference ?? null,
        status: event.status ?? null,
        payload: event.raw ?? null,
      } as any);
    } catch {
      // Unique violation → already delivered. Nothing to do.
      this.logger.log(`Webhook ${event.eventId} already processed — ignoring replay`);
      return { handled: false, reason: 'duplicate' };
    }

    if (event.type !== 'collection' || !event.reference) {
      return { handled: false, reason: 'unsupported event type' };
    }

    // NEVER trust the payload's amount/status — ask the provider directly.
    const verified = await this.provider.verifyCollection(event.reference);
    if (verified.status !== 'successful') {
      await this.pspTx.update(
        { reference: event.reference },
        { status: verified.status === 'failed' ? 'FAILED' : 'PENDING' },
      );
      await this.markEventProcessed(event.eventId);
      return { handled: false, reason: `not successful (${verified.status})` };
    }

    await this.fundEscrow(event.reference, verified.amount, verified.fee, verified.raw);
    await this.markEventProcessed(event.eventId);
    return { handled: true };
  }

  private async markEventProcessed(eventId: string): Promise<void> {
    await this.webhookEvents.update(
      { provider: this.provider.name, eventId: String(eventId) } as any,
      { processed: true },
    );
  }

  /**
   * The moment escrow becomes real. Everything here commits together:
   * the funding journal, the quote's PAID status, the Order, and the closed
   * Inquiry. If any part fails, none of it happened.
   */
  private async fundEscrow(
    reference: string,
    verifiedAmount: string,
    verifiedFee: string | undefined,
    raw: Record<string, any> | undefined,
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const [tx]: PspTransaction[] = await m.query(
        'SELECT * FROM psp_transactions WHERE reference = $1 FOR UPDATE',
        [reference],
      );
      if (!tx) throw new NotFoundException(`Unknown PSP transaction ${reference}`);

      const quote = await m.getRepository(Quote).findOne({
        where: { id: tx.quoteId },
        relations: ['inquiry'],
      });
      if (!quote) throw new NotFoundException(`Quote ${tx.quoteId} not found`);

      const amountNgwee = toNgwee(verifiedAmount);

      // Dr PSP_HOLDING / Cr ESCROW_LIABILITY — the money is at the PSP and we
      // owe it to this deal. The PSP fee is NOT journalled: the buyer bore it,
      // the provider kept it, and it never entered the holding account. It is
      // recorded as a memo so the admin still sees gross vs fee vs net.
      await this.ledger.postJournal(
        {
          type: 'ESCROW_FUNDED',
          idempotencyKey: `escrow-funded:${tx.id}`,
          quoteId: quote.id,
          pspTransactionId: tx.id,
          currency: tx.currency,
          description: `Escrow funded for ${quote.inquiryTitle}`,
          memo: {
            pspReference: tx.providerReference,
            pspFee: verifiedFee ?? tx.feeAmount,
            feeBearer: tx.feeBearer,
            grossChargedToPayer:
              tx.feeBearer === 'customer'
                ? String(Number(verifiedAmount) + Number(verifiedFee ?? tx.feeAmount ?? 0))
                : verifiedAmount,
          },
          lines: [
            {
              accountCode: ACCOUNT.PSP_HOLDING,
              direction: 'DEBIT',
              amountNgwee,
              quoteId: quote.id,
            },
            {
              accountCode: ACCOUNT.ESCROW_LIABILITY,
              direction: 'CREDIT',
              amountNgwee,
              quoteId: quote.id,
              counterpartyId: tx.counterpartyId,
            },
          ],
        },
        m,
      );

      await m.query(
        `UPDATE psp_transactions SET status='SUCCESSFUL', "settledAt"=NOW(), "rawPayload"=$2 WHERE reference=$1`,
        [reference, raw ? JSON.stringify(raw) : null],
      );

      // The order is now a CONSEQUENCE of confirmed payment, not the cause.
      const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await m.getRepository(Order).save(
        m.getRepository(Order).create({
          orderNumber,
          quoteId: quote.id,
          buyerId: tx.counterpartyId,
          sellerId: quote.providerId,
          totalAmount: Number(verifiedAmount),
        } as any),
      );

      await m.getRepository(Quote).update(quote.id, { status: 'PAID' });
      if (quote.inquiryId) {
        await m.getRepository(Inquiry).update(quote.inquiryId, { status: 'CLOSED' });
      }
    });

    this.logger.log(`Escrow funded for ${reference}`);
  }

  /** Payment status for the buyer's polling UI. */
  async status(buyerId: string, reference: string): Promise<any> {
    const tx = await this.pspTx.findOne({ where: { reference } });
    if (!tx) throw new NotFoundException('Payment not found');
    if (tx.counterpartyId !== buyerId) throw new BadRequestException('Not your payment');
    return {
      reference: tx.reference,
      status: tx.status,
      amount: tx.amount,
      fee: tx.feeAmount,
      currency: tx.currency,
      quoteId: tx.quoteId,
    };
  }
}
