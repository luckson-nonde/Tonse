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
import { ConsentsService } from '../consents/consents.service';

/**
 * Financed checkout — the bridge between the marketplace and the lending
 * vertical.
 *
 * A buyer who can't pay cash for an accepted PRODUCT quote finances it: we open
 * a `loan-government` request whose context IS the product (title, spec, price
 * locked as the principal), broadcast it to licensed lenders, and — once a
 * lender approves, the buyer accepts the terms, and the lender pays the
 * principal into the holding account through the PSP — fund the PRODUCT quote's
 * escrow on-platform.
 *
 * The product quote and the loan link through JSON (no schema migration):
 *   • product `quote.dynamicFields.financing = { status, loanInquiryId, ... }`
 *   • loan `inquiry.attributes.{ financedQuoteId, financedInquiryId, ... }`
 *
 * Disbursement goes through the SAME verified PSP collection as cash
 * (`CheckoutService.initiateDisbursement` → webhook → `fundEscrow`), so escrow
 * only funds on a confirmed receipt and the seller's post-payment flow
 * (collection/handover/escrow-release) is identical to cash.
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
    private readonly consentsService: ConsentsService,
  ) {}

  /** Notice key for the salary/payroll-deduction consent a financed borrower
   *  must grant. Recorded in the consents ledger so it's auditable. */
  private static readonly PAYROLL_CONSENT_KEY = 'PAYROLL_DEDUCTION_FINANCING';

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

    // A salary-backed financing request REQUIRES the payroll-deduction consent.
    // Previously the toggle was only enforced in the browser — here it's a hard
    // server gate, and the grant is written to the consents ledger so there is
    // an auditable record (not just a value buried in freeform attributes).
    const consentGranted = (dto.attributes as any)?.payrollDeductionConsent === true;
    if (!consentGranted) {
      throw new BadRequestException(
        'Payroll-deduction consent is required to request salary-backed financing',
      );
    }

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

    // Record the payroll-deduction consent (append-only) — the auditable proof
    // the borrower agreed to salary-deduction repayment for this request.
    await this.consentsService
      .record(buyerId, FinancingService.PAYROLL_CONSENT_KEY, true, '1', 'financing_request')
      .catch((e) => this.logger.warn(`Consent record failed: ${(e as Error).message}`));

    this.audit({
      action: 'FINANCING_REQUESTED',
      entityType: 'QUOTE',
      entityId: quote.id,
      buyerId,
      targetTitle: quote.inquiryTitle,
      amount: principal,
      details: 'Buyer requested lender financing for a product quote (payroll-deduction consent recorded)',
    });

    return { loanInquiryId: loanInquiry.id, productQuoteId: quote.id, principal };
  }

  /**
   * Lender initiates disbursement: they pay the principal into the holding
   * account through the SAME verified PSP collection as a cash buyer. This does
   * NOT fund escrow directly — it starts a collection and returns a pending
   * state. Escrow, the Order, the loan → DISBURSED and the financing → FUNDED
   * flips all happen later in `CheckoutService.fundEscrow` when the provider's
   * webhook confirms the money actually arrived. So a lender can no longer mark
   * a deal paid without real funds landing.
   *
   * Requires: the loan offer is this lender's, is a LOAN, is ACCEPTED by the
   * borrower, and actually finances a product quote.
   */
  async initiateDisbursement(
    lenderId: string,
    loanQuoteId: string,
    opts?: { phone?: string; operator?: string },
  ): Promise<{ reference: string; status: string; amount: string; productQuoteId: string; instruction?: string }> {
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
    if (financing.status === 'FUNDED') {
      throw new ConflictException('This order is already funded');
    }
    const buyerId = (productQuote.inquiry as any)?.buyerId;
    if (!buyerId) throw new ConflictException('Financed quote has no buyer');

    // Start a verified collection from the LENDER for the principal. Escrow is
    // funded only when the webhook confirms — see CheckoutService.fundEscrow,
    // which then advances the loan to DISBURSED and the financing to FUNDED.
    const result = await this.checkoutService.initiateDisbursement({
      productQuoteId: financedQuoteId,
      lenderId,
      buyerId,
      loanQuoteId: loanQuote.id,
      loanInquiryId: loanQuote.inquiryId,
      phone: opts?.phone,
      operator: opts?.operator,
    });

    this.audit({
      action: 'FINANCING_DISBURSEMENT_INITIATED',
      entityType: 'QUOTE',
      entityId: productQuote.id,
      providerId: lenderId,
      targetTitle: productQuote.inquiryTitle,
      amount: Number(result.amount) || 0,
      details: `Lender initiated disbursement (ref ${result.reference}) — escrow funds on confirmation`,
    });

    return { ...result, productQuoteId: productQuote.id };
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
