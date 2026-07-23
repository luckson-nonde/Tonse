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
import { isEscrowHolding } from '../quotes/quote-status';
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly notifications: NotificationsService,
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
    // Financed checkout in flight: block a parallel cash payment so the buyer
    // can't both finance AND pay for the same quote (which would leave them with
    // an unnecessary loan against an already-funded order). Cancel financing to
    // pay another way.
    if ((quote.dynamicFields as any)?.financing?.status === 'REQUESTED') {
      throw new ConflictException(
        'This quote has a financing request in progress — cancel it to pay another way',
      );
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
   * Start a deposit into the caller's own venture account — money in with no
   * quote behind it. Same shape as `checkout()` (persist-before-call, amount
   * from the request since there's no quote to read it from), minus the
   * quote lookup. `psp_transactions.quoteId` stays NULL, which is what
   * `handleWebhook()` uses to route the eventual webhook here instead of to
   * `fundEscrow()`.
   */
  async initiateVentureDeposit(
    sellerId: string,
    dto: { amount: string; channel?: Channel; phone?: string; operator?: string },
  ): Promise<{
    reference: string;
    status: string;
    amount: string;
    fee: string;
    totalCharged: string;
    instruction?: string;
  }> {
    const amountNgwee = toNgwee(dto.amount);
    if (amountNgwee <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    const bearer = this.config.get<'customer' | 'merchant'>('psp.feeBearer') || 'customer';
    const channel: Channel = dto.channel || 'mobile-money';
    const fees = await this.provider.quoteFees({ amount: dto.amount, channel, bearer });

    const reference = `VDP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Persist BEFORE the outbound call — same reason as checkout(): a webhook
    // can arrive before this HTTP response returns.
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
        quoteId: null,
        counterpartyId: sellerId,
        payerMsisdn: dto.phone ?? null,
        channel,
        idempotencyKey: `venture-deposit:${reference}`,
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
        description: 'ProQuote venture account deposit',
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

    // Route on what kind of collection this was. `quoteId` is only ever set
    // for a checkout(); initiateVentureDeposit() always leaves it NULL — that
    // absence is the discriminator, not a flag, so there's no way for a
    // deposit to accidentally be mistaken for (or vice versa) a quote payment.
    const tx = await this.pspTx.findOne({ where: { reference: event.reference } });
    if (!tx) throw new NotFoundException(`Unknown PSP transaction ${event.reference}`);

    if (tx.quoteId) {
      await this.fundEscrow(event.reference, verified.amount, verified.fee, verified.raw);
    } else {
      await this.fundVentureDeposit(event.reference, verified.amount, verified.fee, verified.raw);
    }
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
    let paid: {
      buyerId: string;
      sellerId: string;
      quoteId: string;
      inquiryId: string | null;
      inquiryTitle: string;
      amount: string;
    } | null = null;
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

      paid = {
        buyerId: tx.counterpartyId,
        sellerId: quote.providerId,
        quoteId: quote.id,
        inquiryId: quote.inquiryId ?? null,
        inquiryTitle: quote.inquiryTitle,
        amount: verifiedAmount,
      };
    });

    this.logger.log(`Escrow funded for ${reference}`);
    // Post-commit: tell buyer + seller the item is paid. Fire-and-forget.
    if (paid) this.emitOrderPaid({ ...paid, source: 'CASH' });
  }

  /**
   * Tell buyer + seller a quote's escrow is funded ("the item is paid for").
   * Fire-and-forget, POST-COMMIT: a notification failure must never unwind a
   * funded payment. Also closes a prior gap — funding emitted nothing, so the
   * seller only discovered a paid parcel by polling the collection queue.
   */
  private emitOrderPaid(ctx: {
    buyerId: string;
    sellerId: string;
    quoteId: string;
    inquiryId: string | null;
    inquiryTitle: string;
    amount: string;
    source: 'CASH' | 'LOAN';
  }): void {
    const financed = ctx.source === 'LOAN';
    void this.notifications
      .notifyUsers([ctx.buyerId], 'ORDER_PAID', () => ({
        title: financed
          ? `Your loan was approved — "${ctx.inquiryTitle}" is paid for`
          : `Payment confirmed — "${ctx.inquiryTitle}" is paid for`,
        inquiryId: ctx.inquiryId ?? undefined,
        quoteId: ctx.quoteId,
        data: { role: 'buyer', amount: ctx.amount, source: ctx.source },
      }))
      .catch((e) => this.logger.warn(`ORDER_PAID buyer notify failed: ${(e as Error).message}`));
    void this.notifications
      .notifyUsers([ctx.sellerId], 'ORDER_PAID', () => ({
        title: financed
          ? `"${ctx.inquiryTitle}" has been paid for (buyer financing) — proceed`
          : `"${ctx.inquiryTitle}" has been paid for — proceed`,
        inquiryId: ctx.inquiryId ?? undefined,
        quoteId: ctx.quoteId,
        data: { role: 'seller', amount: ctx.amount, source: ctx.source },
      }))
      .catch((e) => this.logger.warn(`ORDER_PAID seller notify failed: ${(e as Error).message}`));
  }

  /**
   * Fund a quote's escrow from an OFF-PLATFORM source — a lender's approved loan
   * disbursement (financed checkout) — rather than a PSP collection. The lender
   * transfers the principal into the PSP holding account out-of-band, then
   * confirms; THIS call records the escrow. It posts the same ESCROW_FUNDED
   * journal, creates the Order and flips the quote → PAID / inquiry → CLOSED, so
   * the seller's downstream flow is byte-for-byte identical to a cash sale.
   * `memo.source = 'LOAN'` names the funder in the ledger.
   *
   * Idempotent: if the quote is already escrow-holding the call is a no-op and
   * returns `{ alreadyFunded: true }`; the journal's own idempotency key
   * (`escrow-funded-loan:<scope>`) is the second line of defence.
   *
   * TRUST BOUNDARY: escrow is recorded on the lender's CONFIRMATION, not an
   * independently-verified PSP receipt. Production hardening would gate this
   * behind an admin/PSP reconciliation of the incoming transfer.
   */
  async fundEscrowFromExternal(params: {
    quoteId: string;
    buyerId: string;
    idempotencyScope: string;
    memo?: Record<string, any>;
  }): Promise<{ orderId: string | null; alreadyFunded: boolean; amount: string }> {
    let outcome: { orderId: string | null; alreadyFunded: boolean; amount: string } | null = null;
    let paid: {
      buyerId: string;
      sellerId: string;
      quoteId: string;
      inquiryId: string | null;
      inquiryTitle: string;
      amount: string;
    } | null = null;

    await this.dataSource.transaction(async (m) => {
      const quote = await m.getRepository(Quote).findOne({
        where: { id: params.quoteId },
        relations: ['inquiry'],
      });
      if (!quote) throw new NotFoundException('Quote not found');

      // Idempotent: escrow already funded → no-op (a retried confirmation, or a
      // race with a concurrent confirm).
      if (isEscrowHolding(quote.status)) {
        outcome = { orderId: null, alreadyFunded: true, amount: String(quote.price) };
        return;
      }
      if (quote.status !== 'ACCEPTED' && quote.status !== 'PENDING') {
        throw new ConflictException(`This quote can't be funded from status ${quote.status}`);
      }

      const amount = String(quote.price);
      const amountNgwee = toNgwee(amount);

      // Same journal as a cash sale — the money physically sits in PSP_HOLDING
      // (the lender paid into it) and we owe it to this deal. The funder is
      // recorded in the memo, not a different account, so escrow reconciliation
      // and the seller's release path are unchanged.
      await this.ledger.postJournal(
        {
          type: 'ESCROW_FUNDED',
          idempotencyKey: `escrow-funded-loan:${params.idempotencyScope}`,
          quoteId: quote.id,
          currency: 'ZMW',
          description: `Escrow funded (loan) for ${quote.inquiryTitle}`,
          memo: { source: 'LOAN', ...(params.memo ?? {}) },
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
              counterpartyId: params.buyerId,
            },
          ],
        },
        m,
      );

      const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const order = await m.getRepository(Order).save(
        m.getRepository(Order).create({
          orderNumber,
          quoteId: quote.id,
          buyerId: params.buyerId,
          sellerId: quote.providerId,
          totalAmount: Number(amount),
        } as any),
      );

      await m.getRepository(Quote).update(quote.id, { status: 'PAID' });
      if (quote.inquiryId) {
        await m.getRepository(Inquiry).update(quote.inquiryId, { status: 'CLOSED' });
      }

      outcome = { orderId: (order as any).id, alreadyFunded: false, amount };
      paid = {
        buyerId: params.buyerId,
        sellerId: quote.providerId,
        quoteId: quote.id,
        inquiryId: quote.inquiryId ?? null,
        inquiryTitle: quote.inquiryTitle,
        amount,
      };
    });

    if (paid) this.emitOrderPaid({ ...paid, source: 'LOAN' });
    if (!outcome) throw new Error('Financed escrow funding did not complete');
    return outcome;
  }

  /**
   * The moment a venture-account deposit becomes real. Mirrors `fundEscrow`'s
   * locking/idempotency shape exactly, but there is no quote, Order or
   * Inquiry involved — just a direct credit to the depositor's own balance.
   */
  private async fundVentureDeposit(
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
      if (tx.status === 'SUCCESSFUL') return; // idempotent — never double-credit

      const amountNgwee = toNgwee(verifiedAmount);

      // Dr PSP_HOLDING / Cr SELLER_PAYABLE — same accounts and same
      // fee-as-memo-only treatment as fundEscrow, just with no quote
      // dimension since this money isn't attached to any deal.
      await this.ledger.postJournal(
        {
          type: 'VENTURE_DEPOSIT',
          idempotencyKey: `venture-deposit:${tx.id}`,
          pspTransactionId: tx.id,
          currency: tx.currency,
          description: 'Venture account deposit',
          memo: {
            pspReference: tx.providerReference,
            pspFee: verifiedFee ?? tx.feeAmount,
            feeBearer: tx.feeBearer,
          },
          lines: [
            {
              accountCode: ACCOUNT.PSP_HOLDING,
              direction: 'DEBIT',
              amountNgwee,
            },
            {
              accountCode: ACCOUNT.SELLER_PAYABLE,
              direction: 'CREDIT',
              amountNgwee,
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
    });

    this.logger.log(`Venture deposit funded for ${reference}`);
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
