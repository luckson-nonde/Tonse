import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { QuotesService } from '../quotes/quotes.service';
import { InquiriesService } from '../inquiries/inquiries.service';
import { CheckoutService } from '../payments/checkout.service';
import { AuditService } from '../audit/audit.service';

/**
 * Financed checkout — the bridge between the marketplace and the lending
 * vertical.
 *
 * A buyer who can't pay cash for an accepted PRODUCT quote finances it: we open
 * a `loan-government` request whose context IS the product (title, spec, price
 * locked as the principal), broadcast it to licensed lenders, and — once a
 * lender approves, the buyer accepts the terms, and the lender confirms the
 * off-platform disbursement — fund the PRODUCT quote's escrow on-platform.
 *
 * The product quote and the loan link through JSON (no schema migration):
 *   • product `quote.dynamicFields.financing = { status, loanInquiryId, ... }`
 *   • loan `inquiry.attributes.{ financedQuoteId, financedInquiryId, ... }`
 *
 * Settlement reuses `CheckoutService.fundEscrowFromExternal`, so the seller's
 * post-payment flow (collection/handover/escrow-release) is identical to cash.
 */
@Injectable()
export class FinancingService {
  private readonly logger = new Logger(FinancingService.name);

  /** The loan type used for purchase financing (salary/payroll-backed). */
  private static readonly FINANCING_CATEGORY_ID = 'loan-government';

  /** Financing sub-states carried on the product quote's dynamicFields.
   *  Coarse on purpose — REQUESTED covers the whole in-flight window. */
  private static readonly ACTIVE_FINANCING = ['REQUESTED'];

  constructor(
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
    private readonly quotesService: QuotesService,
    private readonly inquiriesService: InquiriesService,
    private readonly checkoutService: CheckoutService,
    private readonly auditService: AuditService,
  ) {}

  private audit(entry: Record<string, any>) {
    return this.auditService.create(entry as any).catch(() => undefined);
  }

  /**
   * Buyer opens a financing request for a product quote they own. Creates the
   * `loan-government` inquiry (product context in `attributes`, principal locked
   * to the quote price) and stamps the product quote's financing flag. Creating
   * the inquiry dispatches NEW_LEAD to matched lenders (broadcast; optionally
   * targeted at one lender).
   */
  async createRequest(
    buyerId: string,
    dto: {
      productQuoteId: string;
      tenureMonths?: string | number;
      attributes?: Record<string, any>;
      targetedLenderId?: string;
    },
  ): Promise<{ loanInquiryId: string; productQuoteId: string; principal: number }> {
    if (!dto?.productQuoteId) throw new BadRequestException('productQuoteId is required');

    const quote = await this.quotesService.findOne(dto.productQuoteId);
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.inquiry?.buyerId !== buyerId) {
      throw new ForbiddenException('This quote is not yours to finance');
    }
    if ((quote as any).condition === 'LOAN') {
      throw new BadRequestException('A loan offer cannot itself be financed');
    }
    if (!['ACCEPTED', 'PENDING'].includes(quote.status)) {
      throw new ConflictException(`A quote in status ${quote.status} can't be financed`);
    }
    const existing = (quote.dynamicFields as any)?.financing;
    if (existing && FinancingService.ACTIVE_FINANCING.includes(existing.status)) {
      throw new ConflictException('This quote already has a financing request in progress');
    }

    const principal = Number(quote.price) || 0;
    if (principal <= 0) throw new BadRequestException('This quote has no payable amount');

    // The buyer is committing to this quote — reflect it as ACCEPTED so the
    // seller sees an accepted deal (with a "financing in progress" badge) rather
    // than a stale PENDING one. Server-authoritative; ACCEPTED is otherwise a
    // client-settable status anyway.
    if (quote.status === 'PENDING') {
      await this.quotesService.updateStatus(quote.id, 'ACCEPTED');
    }

    const productSpec = (quote.inquiry as any)?.attributes ?? null;
    const loanAttributes: Record<string, any> = {
      ...(dto.attributes ?? {}),
      // Locked terms — the loan amount is the purchase price, not buyer-chosen.
      loanAmount: principal,
      tenureMonths: dto.tenureMonths ?? (dto.attributes as any)?.tenureMonths ?? null,
      purpose: `Purchase financing for "${quote.inquiryTitle}"`,
      // Financed-checkout linkage + lender-facing product context.
      financing: true,
      financedQuoteId: quote.id,
      financedInquiryId: quote.inquiryId,
      productTitle: quote.inquiryTitle,
      productSpec,
      sellerId: quote.providerId,
      sellerName: quote.providerName,
      principal,
    };

    const location = (quote.inquiry as any)?.location || 'Zambia';
    const loanInquiry = await this.inquiriesService.create({
      title: `Financing: ${quote.inquiryTitle}`.slice(0, 255),
      description:
        `Purchase-financing request for "${quote.inquiryTitle}" ` +
        `(ZMW ${principal.toLocaleString()}). Government-employee salary-backed loan; ` +
        `on approval the lender disburses into the platform holding account for this order.`,
      buyerId,
      categoryIds: [FinancingService.FINANCING_CATEGORY_ID],
      location,
      province: (quote.inquiry as any)?.province,
      city: (quote.inquiry as any)?.city,
      attributes: loanAttributes as any,
      processType: 'STANDARD',
      targetedProviderId: dto.targetedLenderId,
    } as any);

    // Stamp the product quote so the seller badge + buyer "awaiting financing"
    // state render, and a second financing request is rejected.
    await this.quotesService.patchDynamicFields(quote.id, {
      financing: {
        status: 'REQUESTED',
        loanInquiryId: loanInquiry.id,
        principal,
        targetedLenderId: dto.targetedLenderId ?? null,
        requestedAt: new Date().toISOString(),
      },
    });

    this.audit({
      action: 'FINANCING_REQUESTED',
      entityType: 'QUOTE',
      entityId: quote.id,
      buyerId,
      targetTitle: quote.inquiryTitle,
      amount: principal,
      details: 'Buyer requested lender financing for a product quote',
    });

    return { loanInquiryId: loanInquiry.id, productQuoteId: quote.id, principal };
  }

  /**
   * Lender confirms they have disbursed the principal into the holding account
   * (off-platform transfer). THIS is the pivot: it funds the PRODUCT quote's
   * escrow, creates the Order, flips it PAID, advances the loan to DISBURSED and
   * notifies buyer + seller (ORDER_PAID, fired inside CheckoutService).
   *
   * Requires: the loan offer is this lender's, is a LOAN, is ACCEPTED by the
   * borrower, and actually finances a product quote. Idempotent — a repeated
   * confirmation is a no-op once the product escrow is funded.
   */
  async settleFinancedOrder(
    lenderId: string,
    loanQuoteId: string,
  ): Promise<{ orderId: string | null; alreadyFunded: boolean; productQuoteId: string }> {
    const loanQuote = await this.quotesService.findOne(loanQuoteId);
    if (!loanQuote) throw new NotFoundException('Loan offer not found');
    if (loanQuote.providerId !== lenderId) throw new ForbiddenException('Not your loan offer');
    if ((loanQuote as any).condition !== 'LOAN') {
      throw new BadRequestException('Not a loan offer');
    }
    if (loanQuote.status !== 'ACCEPTED') {
      throw new ForbiddenException('The borrower must accept the offer before you can disburse it');
    }

    // attributes is a json column (object), but tolerate a stringified payload.
    let loanAttrs: any = (loanQuote.inquiry as any)?.attributes ?? {};
    if (typeof loanAttrs === 'string') {
      try {
        loanAttrs = JSON.parse(loanAttrs);
      } catch {
        loanAttrs = {};
      }
    }
    const financedQuoteId = loanAttrs?.financedQuoteId;
    if (!financedQuoteId) {
      throw new BadRequestException(
        'This loan is not a purchase-financing loan — use the normal loan lifecycle instead',
      );
    }

    const productQuote = await this.quotesService.findOne(financedQuoteId);
    if (!productQuote) throw new NotFoundException('Financed product quote not found');

    // Link sanity: the product quote must point back at THIS loan request.
    const financing = (productQuote.dynamicFields as any)?.financing;
    if (!financing || financing.loanInquiryId !== loanQuote.inquiryId) {
      throw new ConflictException('This loan offer is not linked to that product quote');
    }
    const buyerId = (productQuote.inquiry as any)?.buyerId;
    if (!buyerId) throw new ConflictException('Financed quote has no buyer');

    const outcome = await this.checkoutService.fundEscrowFromExternal({
      quoteId: financedQuoteId,
      buyerId,
      idempotencyScope: loanQuote.id,
      memo: {
        lenderId,
        loanQuoteId: loanQuote.id,
        loanInquiryId: loanQuote.inquiryId,
      },
    });

    // Advance the loan lifecycle tracker to DISBURSED (forward-only; the borrower
    // sees "disbursed" in their "what happens next" tracker) and record the order.
    const now = new Date().toISOString();
    const loanDf = (loanQuote.dynamicFields as any) || {};
    await this.quotesService.patchDynamicFields(loanQuote.id, {
      stage: 'DISBURSED',
      stageAt: { ...(loanDf.stageAt || {}), disbursed: now },
      disbursedAt: now,
      financedOrderId: outcome.orderId,
    });

    // Mark the product-quote financing FUNDED (preserve the rest of the object).
    await this.quotesService.patchDynamicFields(productQuote.id, {
      financing: {
        ...financing,
        status: 'FUNDED',
        loanQuoteId: loanQuote.id,
        lenderId,
        orderId: outcome.orderId,
        fundedAt: now,
      },
    });

    this.audit({
      action: 'FINANCING_DISBURSED',
      entityType: 'QUOTE',
      entityId: productQuote.id,
      providerId: lenderId,
      targetTitle: productQuote.inquiryTitle,
      amount: Number(outcome.amount) || 0,
      status: 'PAID',
      details: outcome.alreadyFunded
        ? 'Disbursement re-confirmed (escrow already funded)'
        : 'Lender confirmed disbursement — product escrow funded',
    });

    return {
      orderId: outcome.orderId,
      alreadyFunded: outcome.alreadyFunded,
      productQuoteId: productQuote.id,
    };
  }

  /**
   * Buyer cancels an in-flight financing request (no lender approved, or they
   * changed their mind) and returns to normal payment. Only allowed BEFORE the
   * loan is funded — once escrow is funded there's a binding order + loan.
   */
  async cancelFinancing(
    buyerId: string,
    productQuoteId: string,
  ): Promise<{ productQuoteId: string; cancelled: boolean }> {
    const quote = await this.quotesService.findOne(productQuoteId);
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.inquiry?.buyerId !== buyerId) {
      throw new ForbiddenException('This quote is not yours');
    }
    const financing = (quote.dynamicFields as any)?.financing;
    if (!financing || !FinancingService.ACTIVE_FINANCING.includes(financing.status)) {
      throw new ConflictException('There is no active financing request to cancel');
    }

    // Close the loan request + archive any offers so lenders/buyer stop seeing it.
    if (financing.loanInquiryId) {
      await this.inquiriesService.updateStatus(financing.loanInquiryId, 'CLOSED').catch(() => undefined);
      await this.quotes
        .createQueryBuilder()
        .update(Quote)
        .set({ status: 'ARCHIVED' })
        .where('"inquiryId" = :id AND status = :pending', {
          id: financing.loanInquiryId,
          pending: 'PENDING',
        })
        .execute()
        .catch(() => undefined);
    }

    await this.quotesService.patchDynamicFields(quote.id, {
      financing: { ...financing, status: 'CANCELLED', cancelledAt: new Date().toISOString() },
    });

    this.audit({
      action: 'FINANCING_CANCELLED',
      entityType: 'QUOTE',
      entityId: quote.id,
      buyerId,
      targetTitle: quote.inquiryTitle,
      details: 'Buyer cancelled the financing request',
    });

    return { productQuoteId: quote.id, cancelled: true };
  }
}
