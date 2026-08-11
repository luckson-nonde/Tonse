import {
  BadRequestException,
  ConflictException,
  forwardRef,
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
import { Advertisement } from '../ads/entities/advertisement.entity';
import { JobPosting } from '../job-board/entities/job-posting.entity';
import { TicketOrder } from '../tickets/entities/ticket-order.entity';
import { TicketsService } from '../tickets/tickets.service';
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
    // forwardRef: TicketsModule imports PaymentsModule for the guest checkout
    // routes, and settling a verified ticket payment needs TicketsService's
    // atomic stock/mint/journal commit — a deliberate, documented cycle.
    @Inject(forwardRef(() => TicketsService))
    private readonly tickets: TicketsService,
  ) {}

  /** Whether the active provider is the sandbox — public "simulate" endpoints
   *  outside this module gate on this so a live deploy can't be simulated. */
  isSandbox(): boolean {
    return this.provider.name === 'sandbox';
  }

  /**
   * Start a collection for a quote. Returns what the payer must do next —
   * which, on a hosted-page provider like DPO, means `redirectUrl`: the payer
   * MUST be sent there or nothing is ever collected.
   *
   * What the payer is charged depends on the provider's fee model
   * (`quoteFees`); only `amount` ever reaches the holding account.
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
    redirectUrl?: string;
    provider?: string;
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
        description: `Nyuwe ${quote.inquiryTitle}`.slice(0, 100),
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
      // Which adapter answered — the frontend branches its pending UI on this
      // (sandbox → simulate button, dpo → approve-on-phone polling card).
      provider: this.provider.name,
      status: result.status,
      amount: fees.amount,
      fee: fees.fee,
      totalCharged: fees.totalCharged,
      instruction: result.instruction,
      redirectUrl: result.redirectUrl,
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
    redirectUrl?: string;
    provider?: string;
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
        description: 'Nyuwe venture account deposit',
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
      // Which adapter answered — the frontend branches its pending UI on this
      // (sandbox → simulate button, dpo → approve-on-phone polling card).
      provider: this.provider.name,
      status: result.status,
      amount: fees.amount,
      fee: fees.fee,
      totalCharged: fees.totalCharged,
      instruction: result.instruction,
      redirectUrl: result.redirectUrl,
    };
  }

  /**
   * Start paying for an ad placement. Mirrors `initiateVentureDeposit()`
   * exactly (no quote, amount read from our own row not the client) — the
   * only difference is the amount comes from the Advertisement, not the
   * request body, and `context.kind` tags the transaction so the eventual
   * webhook routes to `fundAdPurchase` instead of `fundVentureDeposit`.
   */
  async initiateAdPurchase(
    sellerId: string,
    adId: string,
    dto: { channel?: Channel; phone?: string; operator?: string },
  ): Promise<{
    reference: string;
    status: string;
    amount: string;
    fee: string;
    totalCharged: string;
    instruction?: string;
    redirectUrl?: string;
    provider?: string;
  }> {
    const ad = await this.dataSource.getRepository(Advertisement).findOne({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (ad.sellerId !== sellerId) {
      throw new BadRequestException('This ad is not yours to pay for');
    }
    if (ad.status !== 'PENDING_PAYMENT') {
      throw new ConflictException(`This ad can't be paid from status ${ad.status}`);
    }

    const amount = String(ad.totalPaidAmount);
    const bearer = this.config.get<'customer' | 'merchant'>('psp.feeBearer') || 'customer';
    const channel: Channel = dto.channel || 'mobile-money';
    const fees = await this.provider.quoteFees({ amount, channel, bearer });

    const reference = `ADV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

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
        context: { kind: 'AD_PURCHASE', adId: ad.id },
        payerMsisdn: dto.phone ?? null,
        channel,
        idempotencyKey: `ad-purchase-collection:${reference}`,
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
        description: `Nyuwe ad — ${ad.title}`.slice(0, 100),
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
      // Which adapter answered — the frontend branches its pending UI on this
      // (sandbox → simulate button, dpo → approve-on-phone polling card).
      provider: this.provider.name,
      status: result.status,
      amount: fees.amount,
      fee: fees.fee,
      totalCharged: fees.totalCharged,
      instruction: result.instruction,
      redirectUrl: result.redirectUrl,
    };
  }

  /**
   * Start paying the admin-set job-posting fee. Mirrors `initiateAdPurchase()`
   * — the amount comes from the posting's own feeAmount snapshot (never the
   * request body), and `context.kind` routes the eventual webhook to
   * `fundJobPostFee`.
   */
  async initiateJobPostFee(
    posterId: string,
    jobPostingId: string,
    dto: { channel?: Channel; phone?: string; operator?: string },
  ): Promise<{
    reference: string;
    status: string;
    amount: string;
    fee: string;
    totalCharged: string;
    instruction?: string;
    redirectUrl?: string;
    provider?: string;
  }> {
    const posting = await this.dataSource
      .getRepository(JobPosting)
      .findOne({ where: { id: jobPostingId } });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.posterId !== posterId) {
      throw new BadRequestException('This job posting is not yours to pay for');
    }
    if (posting.status !== 'PENDING_PAYMENT') {
      throw new ConflictException(`This posting can't be paid from status ${posting.status}`);
    }
    if (!posting.feeAmount || Number(posting.feeAmount) <= 0) {
      // A zero-fee posting has nothing to collect — the pay-from-balance
      // endpoint free-promotes it instead of starting a PSP round-trip.
      throw new ConflictException('This posting has no fee to pay');
    }

    const amount = String(posting.feeAmount);
    const bearer = this.config.get<'customer' | 'merchant'>('psp.feeBearer') || 'customer';
    const channel: Channel = dto.channel || 'mobile-money';
    const fees = await this.provider.quoteFees({ amount, channel, bearer });

    const reference = `JPF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

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
        counterpartyId: posterId,
        context: { kind: 'JOB_POST_FEE', jobPostingId: posting.id },
        payerMsisdn: dto.phone ?? null,
        channel,
        idempotencyKey: `job-post-fee-collection:${reference}`,
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
        description: `Nyuwe job post — ${posting.title}`.slice(0, 100),
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
      // Which adapter answered — the frontend branches its pending UI on this
      // (sandbox → simulate button, dpo → approve-on-phone polling card).
      provider: this.provider.name,
      status: result.status,
      amount: fees.amount,
      fee: fees.fee,
      totalCharged: fees.totalCharged,
      instruction: result.instruction,
      redirectUrl: result.redirectUrl,
    };
  }

  /**
   * Start paying for a GUEST ticket order. The payer has no account —
   * `counterpartyId` stays NULL and the transaction is owned by its
   * reference + `context.kind` alone, which is why the guest-facing
   * status/verify methods below exist instead of the JWT-gated generic ones.
   * DPO gets the order's buyer name/phone/email as the customer identity.
   */
  async initiateTicketPurchase(
    orderReference: string,
    dto: { channel?: Channel; phone?: string; operator?: string },
  ): Promise<{
    reference: string;
    provider?: string;
    status: string;
    amount: string;
    fee: string;
    totalCharged: string;
    instruction?: string;
    redirectUrl?: string;
  }> {
    const order = await this.dataSource
      .getRepository(TicketOrder)
      .findOne({ where: { reference: orderReference } });
    if (!order) throw new NotFoundException('Ticket order not found');
    if (order.status !== 'PENDING') {
      throw new ConflictException(`This order can't be paid from status ${order.status}`);
    }

    const amount = String(order.totalAmountZmw);
    const bearer = this.config.get<'customer' | 'merchant'>('psp.feeBearer') || 'customer';
    const channel: Channel = dto.channel || 'mobile-money';
    const fees = await this.provider.quoteFees({ amount, channel, bearer });

    const reference = `TPF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

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
        counterpartyId: null, // guest payer — no user account
        context: { kind: 'TICKET_SALE', ticketOrderId: order.id, orderReference: order.reference },
        payerMsisdn: dto.phone ?? order.buyerPhone ?? null,
        channel,
        idempotencyKey: `ticket-sale-collection:${reference}`,
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
        phone: dto.phone ?? order.buyerPhone ?? undefined,
        operator: dto.operator,
        email: order.buyerEmail ?? undefined,
        name: order.buyerName ?? undefined,
        description: `Nyuwe tickets — ${order.reference}`.slice(0, 100),
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
      provider: this.provider.name,
      status: result.status,
      amount: fees.amount,
      fee: fees.fee,
      totalCharged: fees.totalCharged,
      instruction: result.instruction,
      redirectUrl: result.redirectUrl,
    };
  }

  /** Load a TICKET_SALE psp transaction by reference, or 404. The kind check
   *  is the whole ownership model for guests: these methods can only ever
   *  touch ticket transactions, never an authenticated user's payment. */
  private async ticketTx(reference: string): Promise<PspTransaction> {
    const tx = await this.pspTx.findOne({ where: { reference } });
    if (!tx || (tx.context as any)?.kind !== 'TICKET_SALE') {
      throw new NotFoundException('Ticket payment not found');
    }
    return tx;
  }

  /** Guest polling — same shape as status(), no user ownership check. */
  async ticketPaymentStatus(reference: string): Promise<any> {
    const tx = await this.ticketTx(reference);
    return {
      reference: tx.reference,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
    };
  }

  /** Guest verify-and-settle — the payer's return trip / poll for a ticket
   *  payment. Proves nothing itself: the provider is re-asked, and every
   *  funding step is idempotent (mirrors settleFromReturn minus the userId). */
  async settleTicketFromReturn(
    reference: string,
  ): Promise<{ handled: boolean; reason?: string; status: string }> {
    const tx = await this.ticketTx(reference);
    const outcome = await this.verifyAndSettle(reference, tx.providerReference ?? undefined);
    const settled = await this.pspTx.findOne({ where: { reference } });
    return { ...outcome, status: settled?.status ?? tx.status };
  }

  /**
   * Handle a provider callback. Idempotent twice over: the
   * (provider, eventId) unique index rejects a redelivery, and the journal's
   * own idempotency key rejects a double-post.
   *
   * The callback itself decides nothing — `verifyAndSettle` re-asks the
   * provider. That matters most with DPO, whose Payment Notification carries no
   * signature at all: a forged "paid" event for a real reference is simply
   * contradicted by verifyToken and dropped.
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

    if (event.type !== 'collection') {
      return { handled: false, reason: 'unsupported event type' };
    }

    // DPO's push identifies the transaction by ITS token, not by our reference
    // (their payload carries no CompanyRef), so resolve ours from the token we
    // stored at createToken time. Looking it up in our own table — rather than
    // trusting a reference in the payload — is also what stops a caller naming
    // someone else's transaction.
    const reference = event.reference ?? (await this.resolveReference(event.providerReference));
    if (!reference) {
      return { handled: false, reason: 'unknown transaction' };
    }

    const outcome = await this.verifyAndSettle(reference, event.providerReference);
    await this.markEventProcessed(event.eventId);
    return outcome;
  }

  /** Our reference for a provider-side handle, or null if we've never seen it. */
  private async resolveReference(providerReference?: string): Promise<string | null> {
    if (!providerReference) return null;
    const tx = await this.pspTx.findOne({ where: { providerReference } });
    if (!tx) {
      this.logger.warn(`Callback for unknown provider reference ${providerReference} — ignoring`);
      return null;
    }
    return tx.reference;
  }

  /**
   * Settle from the payer's own return trip off a hosted payment page.
   *
   * A hosted-page provider cannot be relied on for a server-to-server callback
   * alone — DPO's notification is best-effort and its arrival is not ordered
   * against the payer landing back on our site. So the payer's return is a
   * second, independent trigger for the SAME verify-then-journal path. It is
   * safe to race the notification because every funding step is idempotent, and
   * it is safe to expose because it still proves nothing itself: the money only
   * moves if DPO says it moved.
   */
  async settleFromReturn(
    userId: string,
    reference: string,
  ): Promise<{ handled: boolean; reason?: string; status: string }> {
    const tx = await this.pspTx.findOne({ where: { reference } });
    if (!tx) throw new NotFoundException('Payment not found');
    if (tx.counterpartyId !== userId && tx.beneficiaryBuyerId !== userId) {
      throw new BadRequestException('Not your payment');
    }

    const outcome = await this.verifyAndSettle(reference, tx.providerReference ?? undefined);
    const settled = await this.pspTx.findOne({ where: { reference } });
    return { ...outcome, status: settled?.status ?? tx.status };
  }

  /**
   * Verify with the provider, then post whatever the verified result warrants.
   * The single point where a collection becomes money — reached from the
   * provider's callback and from the payer's return trip alike.
   */
  private async verifyAndSettle(
    reference: string,
    calledBackProviderReference?: string,
  ): Promise<{ handled: boolean; reason?: string }> {
    // Route on what kind of collection this was. `quoteId` is only ever set
    // for a checkout(); initiateVentureDeposit() and initiateAdPurchase()
    // both leave it NULL, so between those two `context.kind` is the
    // discriminator (mirrors how LOAN context already rides the same field).
    // Loaded FIRST because the provider handle we verify against comes from
    // our own row, not from the (unauthenticated) callback.
    const tx = await this.pspTx.findOne({ where: { reference } });
    if (!tx) throw new NotFoundException(`Unknown PSP transaction ${reference}`);

    // NEVER trust the payload's amount/status — ask the provider directly.
    const verified = await this.provider.verifyCollection(
      reference,
      tx.providerReference ?? calledBackProviderReference,
    );
    if (verified.status !== 'successful') {
      await this.pspTx.update(
        { reference },
        { status: verified.status === 'failed' ? 'FAILED' : 'PENDING' },
      );
      return { handled: false, reason: `not successful (${verified.status})` };
    }

    // The provider says paid — but paid HOW MUCH? Everything downstream (escrow,
    // the order, the seller's balance) is posted from the verified amount, so a
    // short payment would otherwise fund a deal for less than its price and
    // still mark it PAID. Refuse to settle a mismatch and leave it for a human;
    // an under-funded order is far worse than a delayed one.
    if (toNgwee(verified.amount) !== toNgwee(tx.amount)) {
      this.logger.error(
        `Amount mismatch on ${reference}: expected ${tx.amount}, provider reported ${verified.amount} — NOT settling`,
      );
      await this.pspTx.update(
        { reference },
        { lastError: `Amount mismatch: expected ${tx.amount}, provider reported ${verified.amount}` },
      );
      return { handled: false, reason: 'amount mismatch — held for review' };
    }

    if (tx.quoteId) {
      await this.fundEscrow(reference, verified.amount, verified.fee, verified.raw);
    } else if ((tx.context as any)?.kind === 'AD_PURCHASE') {
      await this.fundAdPurchase(reference, verified.amount, verified.fee, verified.raw, (tx.context as any).adId);
    } else if ((tx.context as any)?.kind === 'JOB_POST_FEE') {
      await this.fundJobPostFee(reference, verified.amount, verified.fee, verified.raw, (tx.context as any).jobPostingId);
    } else if ((tx.context as any)?.kind === 'TICKET_SALE') {
      await this.fundTicketSale(reference, verified.raw, (tx.context as any).orderReference);
    } else {
      await this.fundVentureDeposit(reference, verified.amount, verified.fee, verified.raw);
    }
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
      source: 'CASH' | 'LOAN';
    } | null = null;
    await this.dataSource.transaction(async (m) => {
      const [tx]: PspTransaction[] = await m.query(
        'SELECT * FROM psp_transactions WHERE reference = $1 FOR UPDATE',
        [reference],
      );
      if (!tx) throw new NotFoundException(`Unknown PSP transaction ${reference}`);
      // Idempotent — never double-fund. The journal's own key would no-op a
      // replayed post, but the Order insert below has no such key, so a second
      // delivery (notification racing the payer's return trip) would otherwise
      // mint a duplicate order against one payment.
      if (tx.status === 'SUCCESSFUL') return;

      const quote = await m.getRepository(Quote).findOne({
        where: { id: tx.quoteId },
        relations: ['inquiry'],
      });
      if (!quote) throw new NotFoundException(`Quote ${tx.quoteId} not found`);

      const amountNgwee = toNgwee(verifiedAmount);

      // Who owns this deal. For a cash sale the payer IS the buyer. For a
      // financed disbursement the payer is the LENDER, so the order + escrow
      // belong to `beneficiaryBuyerId`.
      const ctx = (tx.context as any) || {};
      const source: 'CASH' | 'LOAN' = ctx.source === 'LOAN' ? 'LOAN' : 'CASH';
      const buyerId = tx.beneficiaryBuyerId || tx.counterpartyId;

      // Dr PSP_HOLDING / Cr ESCROW_LIABILITY — the money is at the PSP and we
      // owe it to this deal. Identical for cash and loan: the lender really
      // paid the principal into the holding account (verified above), so the
      // seller's downstream release path is unchanged. The PSP fee is NOT
      // journalled: the payer bore it, the provider kept it, it never entered
      // the holding account — recorded as a memo only.
      await this.ledger.postJournal(
        {
          type: 'ESCROW_FUNDED',
          idempotencyKey: `escrow-funded:${tx.id}`,
          quoteId: quote.id,
          pspTransactionId: tx.id,
          currency: tx.currency,
          description: `Escrow funded${source === 'LOAN' ? ' (loan)' : ''} for ${quote.inquiryTitle}`,
          memo: {
            source,
            pspReference: tx.providerReference,
            pspFee: verifiedFee ?? tx.feeAmount,
            feeBearer: tx.feeBearer,
            grossChargedToPayer:
              tx.feeBearer === 'customer'
                ? String(Number(verifiedAmount) + Number(verifiedFee ?? tx.feeAmount ?? 0))
                : verifiedAmount,
            ...(source === 'LOAN'
              ? { lenderId: ctx.lenderId, loanQuoteId: ctx.loanQuoteId, loanInquiryId: ctx.loanInquiryId }
              : {}),
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
              counterpartyId: buyerId,
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
      const order = await m.getRepository(Order).save(
        m.getRepository(Order).create({
          orderNumber,
          quoteId: quote.id,
          buyerId,
          sellerId: quote.providerId,
          totalAmount: Number(verifiedAmount),
        } as any),
      );

      // The collection code is what the seller's handover flow looks up
      // (CollectionService finds the quote BY this code), so a paid quote
      // without one can never be collected. Same shape direct-order uses;
      // 4 random bytes collide rarely, but retry because a duplicate would
      // make CollectionService resolve someone else's deal.
      let collectionCode = quote.collectionCode;
      if (!collectionCode) {
        do {
          collectionCode = `PQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        } while (await m.getRepository(Quote).countBy({ collectionCode }));
      }

      await m.getRepository(Quote).update(quote.id, { status: 'PAID', collectionCode });
      if (quote.inquiryId) {
        await m.getRepository(Inquiry).update(quote.inquiryId, { status: 'CLOSED' });
      }

      // FINANCED disbursement side-effects — applied ONLY here, on a verified
      // receipt, never on a lender's bare click. Advance the loan offer to
      // DISBURSED and flip the product quote's financing to FUNDED, mirroring
      // what the old (trusted) settleFinancedOrder did — but now the money is
      // provably in the holding account first.
      if (source === 'LOAN' && ctx.loanQuoteId) {
        const loanQuote = await m.getRepository(Quote).findOne({ where: { id: ctx.loanQuoteId } });
        if (loanQuote) {
          const loanDyn: any = { ...(loanQuote.dynamicFields || {}) };
          loanDyn.stage = 'DISBURSED';
          loanDyn.stageAt = new Date().toISOString();
          loanDyn.disbursedAt = new Date().toISOString();
          loanDyn.financedOrderId = (order as any).id;
          await m.getRepository(Quote).update(loanQuote.id, { dynamicFields: loanDyn });
        }
        const productDyn: any = { ...(quote.dynamicFields || {}) };
        productDyn.financing = {
          ...(productDyn.financing || {}),
          status: 'FUNDED',
          loanQuoteId: ctx.loanQuoteId,
          lenderId: ctx.lenderId ?? tx.counterpartyId,
          orderId: (order as any).id,
          fundedAt: new Date().toISOString(),
        };
        // Re-apply on the SAME row we already updated to PAID (merge, don't clobber).
        await m.getRepository(Quote).update(quote.id, { status: 'PAID', dynamicFields: productDyn });
      }

      paid = {
        buyerId,
        sellerId: quote.providerId,
        quoteId: quote.id,
        inquiryId: quote.inquiryId ?? null,
        inquiryTitle: quote.inquiryTitle,
        amount: verifiedAmount,
        source,
      };
    });

    this.logger.log(`Escrow funded for ${reference}`);
    // Post-commit: tell buyer + seller the item is paid. Fire-and-forget.
    if (paid) this.emitOrderPaid(paid);
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
   * FINANCED DISBURSEMENT — the lender pays the principal into the holding
   * account through the SAME verified PSP collection as a cash buyer. This
   * replaces the old trust-based `fundEscrowFromExternal`, where escrow was
   * booked on the lender's word alone (inflating PSP_HOLDING with money that
   * may never have arrived). Now nothing is funded until the provider's webhook
   * confirms the collection, at which point `fundEscrow` (LOAN-aware) posts the
   * journal, creates the buyer's order, and advances the loan to DISBURSED.
   *
   * The payer is the LENDER (`counterpartyId`); the deal's buyer is carried in
   * `beneficiaryBuyerId`; the financing links ride in `context`.
   */
  async initiateDisbursement(params: {
    productQuoteId: string;
    lenderId: string;
    buyerId: string;
    loanQuoteId: string;
    loanInquiryId?: string | null;
    channel?: Channel;
    phone?: string;
    operator?: string;
  }): Promise<{
    reference: string;
    status: string;
    amount: string;
    instruction?: string;
    redirectUrl?: string;
    provider?: string;
  }> {
    const quote = await this.dataSource.getRepository(Quote).findOne({
      where: { id: params.productQuoteId },
    });
    if (!quote) throw new NotFoundException('Product quote not found');
    if (isEscrowHolding(quote.status)) {
      throw new ConflictException('This order is already funded');
    }
    if (quote.status !== 'ACCEPTED' && quote.status !== 'PENDING') {
      throw new ConflictException(`This quote can't be funded from status ${quote.status}`);
    }

    const amount = String(quote.price);
    const bearer = this.config.get<'customer' | 'merchant'>('psp.feeBearer') || 'customer';
    const channel: Channel = params.channel || 'mobile-money';
    const fees = await this.provider.quoteFees({ amount, channel, bearer });
    const reference = `TSE-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Persist BEFORE the outbound call (a webhook can beat the HTTP response).
    // counterpartyId = the LENDER (payer); beneficiaryBuyerId = the buyer whose
    // order + escrow this funds; context drives the funded side-effects.
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
        counterpartyId: params.lenderId,
        beneficiaryBuyerId: params.buyerId,
        context: {
          source: 'LOAN',
          loanQuoteId: params.loanQuoteId,
          loanInquiryId: params.loanInquiryId ?? null,
          lenderId: params.lenderId,
        },
        payerMsisdn: params.phone ?? null,
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
        phone: params.phone,
        operator: params.operator,
        description: `TONSE loan disbursement — ${quote.inquiryTitle}`.slice(0, 100),
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
      // Which adapter answered — the frontend branches its pending UI on this
      // (sandbox → simulate button, dpo → approve-on-phone polling card).
      provider: this.provider.name,
      status: result.status,
      amount: fees.amount,
      instruction: result.instruction,
      redirectUrl: result.redirectUrl,
    };
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

  /**
   * The moment an ad-placement purchase becomes real. Same locking/idempotency
   * shape as `fundVentureDeposit`, but the money goes to AD_REVENUE (the
   * platform earned it) rather than the seller's own payable — and the paid
   * ad advances into the admin review queue.
   */
  private async fundAdPurchase(
    reference: string,
    verifiedAmount: string,
    verifiedFee: string | undefined,
    raw: Record<string, any> | undefined,
    adId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const [tx]: PspTransaction[] = await m.query(
        'SELECT * FROM psp_transactions WHERE reference = $1 FOR UPDATE',
        [reference],
      );
      if (!tx) throw new NotFoundException(`Unknown PSP transaction ${reference}`);
      if (tx.status === 'SUCCESSFUL') return; // idempotent — never double-credit

      const amountNgwee = toNgwee(verifiedAmount);

      await this.ledger.postJournal(
        {
          type: 'AD_PURCHASE',
          idempotencyKey: `ad-purchase:${tx.id}`,
          pspTransactionId: tx.id,
          currency: tx.currency,
          description: 'Advertisement placement purchase',
          memo: {
            adId,
            pspReference: tx.providerReference,
            pspFee: verifiedFee ?? tx.feeAmount,
            feeBearer: tx.feeBearer,
          },
          lines: [
            { accountCode: ACCOUNT.PSP_HOLDING, direction: 'DEBIT', amountNgwee },
            { accountCode: ACCOUNT.AD_REVENUE, direction: 'CREDIT', amountNgwee },
          ],
        },
        m,
      );

      await m.query(
        `UPDATE psp_transactions SET status='SUCCESSFUL', "settledAt"=NOW(), "rawPayload"=$2 WHERE reference=$1`,
        [reference, raw ? JSON.stringify(raw) : null],
      );

      await m.getRepository(Advertisement).update(adId, { status: 'PENDING_APPROVAL' });
    });

    this.logger.log(`Ad purchase funded for ${reference}`);
  }

  /**
   * The moment a job-posting fee becomes real. Same locking/idempotency shape
   * as `fundAdPurchase`: money to JOB_BOARD_REVENUE (the platform earned it),
   * and the paid posting advances into the admin review queue.
   */
  private async fundJobPostFee(
    reference: string,
    verifiedAmount: string,
    verifiedFee: string | undefined,
    raw: Record<string, any> | undefined,
    jobPostingId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const [tx]: PspTransaction[] = await m.query(
        'SELECT * FROM psp_transactions WHERE reference = $1 FOR UPDATE',
        [reference],
      );
      if (!tx) throw new NotFoundException(`Unknown PSP transaction ${reference}`);
      if (tx.status === 'SUCCESSFUL') return; // idempotent — never double-credit

      const amountNgwee = toNgwee(verifiedAmount);

      await this.ledger.postJournal(
        {
          type: 'JOB_POST_FEE',
          idempotencyKey: `job-post-fee:${tx.id}`,
          pspTransactionId: tx.id,
          currency: tx.currency,
          description: 'Job posting fee',
          memo: {
            jobPostingId,
            pspReference: tx.providerReference,
            pspFee: verifiedFee ?? tx.feeAmount,
            feeBearer: tx.feeBearer,
          },
          lines: [
            { accountCode: ACCOUNT.PSP_HOLDING, direction: 'DEBIT', amountNgwee },
            { accountCode: ACCOUNT.JOB_BOARD_REVENUE, direction: 'CREDIT', amountNgwee },
          ],
        },
        m,
      );

      await m.query(
        `UPDATE psp_transactions SET status='SUCCESSFUL', "settledAt"=NOW(), "rawPayload"=$2 WHERE reference=$1`,
        [reference, raw ? JSON.stringify(raw) : null],
      );

      // Only out of PENDING_PAYMENT — a webhook replay after the poster
      // already paid via balance must not yank an APPROVED posting backwards.
      await m
        .getRepository(JobPosting)
        .update({ id: jobPostingId, status: 'PENDING_PAYMENT' }, { status: 'PENDING_APPROVAL' });
    });

    this.logger.log(`Job posting fee funded for ${reference}`);
  }

  /**
   * A verified GUEST ticket payment becomes tickets. The atomic commit
   * (stock re-check, mint, TICKET_SALE journal with the seller's net and the
   * platform's commission, order → PAID) lives in TicketsService and is
   * idempotent on the order — so the tickets are minted FIRST, and only then
   * is the psp transaction marked SUCCESSFUL. If this crashes in between, a
   * replayed webhook/verify re-runs the commit (which no-ops) and completes
   * the psp update; the reverse order could strand a paid order forever.
   *
   * Sold-out-while-paying is the one genuinely bad path: money verified but
   * stock gone. The commit throws, the psp row keeps lastError, and it stays
   * un-SUCCESSFUL for an admin to refund manually — logged as CRITICAL.
   */
  private async fundTicketSale(
    reference: string,
    raw: Record<string, any> | undefined,
    orderReference: string,
  ): Promise<void> {
    const tx = await this.pspTx.findOne({ where: { reference } });
    if (!tx) throw new NotFoundException(`Unknown PSP transaction ${reference}`);
    if (tx.status === 'SUCCESSFUL') return; // already funded — replay

    try {
      await this.tickets.commitPaidTicketOrder(orderReference);
    } catch (e) {
      this.logger.error(
        `CRITICAL: verified ticket payment ${reference} could not be committed ` +
          `(order ${orderReference}): ${(e as Error).message} — needs manual refund/review`,
      );
      await this.pspTx.update(
        { reference },
        { lastError: `Paid but not committed: ${(e as Error).message}` },
      );
      throw e;
    }

    await this.pspTx.update(
      { reference },
      { status: 'SUCCESSFUL', settledAt: new Date(), rawPayload: raw ?? null } as any,
    );
    this.logger.log(`Ticket sale funded for ${reference} (order ${orderReference})`);
  }

  /** Payment status for a polling UI. Visible to the payer (buyer for cash,
   *  lender for a disbursement) or the deal's beneficiary buyer. */
  async status(userId: string, reference: string): Promise<any> {
    const tx = await this.pspTx.findOne({ where: { reference } });
    if (!tx) throw new NotFoundException('Payment not found');
    if (tx.counterpartyId !== userId && tx.beneficiaryBuyerId !== userId) {
      throw new BadRequestException('Not your payment');
    }
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
