import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { QuotesService } from '../quotes/quotes.service';
import { AuditService } from '../audit/audit.service';
import { InquiriesService } from '../inquiries/inquiries.service';

/**
 * Lending surface — a lender's loan officer reviews borrower requests and makes
 * loan OFFERS (which are Quotes) or declines. Scoped to the lender shop
 * (`parentProviderId ?? id`), so a staff Loan Officer acts as their parent
 * lender and never needs MANAGE_QUOTES / the generic /quotes surface.
 *
 * A loan offer = a Quote: `price` is the approved principal, the terms
 * (interest, tenure, fees, monthly repayment) live in `dynamicFields`.
 * Accepting an offer is the normal buyer-side quote ACCEPT — no Order.
 */
@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
    private readonly quotesService: QuotesService,
    private readonly auditService: AuditService,
    private readonly inquiriesService: InquiriesService,
  ) {}

  private audit(entry: Record<string, any>) {
    return this.auditService.create(entry as any).catch(() => undefined);
  }

  /**
   * A lender may only make/decline offers on a real request that is broadcast
   * OR targeted at them — never an arbitrary inquiry id. Prevents unsolicited /
   * cross-tenant loan writes and honours the `targetedProviderId` model.
   */
  private async assertOwnLoanRequest(lenderId: string, inquiryId: string): Promise<void> {
    if (!inquiryId) throw new NotFoundException('Loan request not found');
    const inquiry = await this.inquiriesService.findOne(inquiryId);
    if (!inquiry) throw new NotFoundException('Loan request not found');
    const target = (inquiry as any).targetedProviderId;
    if (target && target !== lenderId) {
      throw new ForbiddenException('This loan request is not addressed to you');
    }
  }

  /** Loan offers this lender has made (incl. accepted / declined). */
  async listOffers(lenderId: string): Promise<Quote[]> {
    return this.quotes.find({
      where: { providerId: lenderId },
      relations: ['inquiry'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Make a loan offer on a borrower's request. */
  async createOffer(lenderId: string, dto: any): Promise<Quote> {
    await this.assertOwnLoanRequest(lenderId, dto?.inquiryId);
    const { inquiryId, inquiryTitle, providerName, price, condition, message, ...terms } = dto;
    const quote = await this.quotesService.create({
      inquiryId,
      inquiryTitle: inquiryTitle || 'Loan Request',
      providerId: lenderId,
      providerName: providerName || 'Lender',
      price: Number(price) || 0,
      condition: condition || 'LOAN',
      message: String(message || terms?.conditions || 'Loan offer'),
      status: 'PENDING',
      dynamicFields: terms,
    } as any);
    this.audit({
      action: 'LOAN_OFFER_MADE',
      entityType: 'QUOTE',
      entityId: quote.id,
      providerId: lenderId,
      targetTitle: quote.inquiryTitle,
      amount: Number(quote.price) || 0,
      status: 'PENDING',
      details: 'Lender made a loan offer',
    });
    return quote;
  }

  /** Decline a request — a REJECTED Quote carrying the reason. Does NOT flip
   *  the request to QUOTED (a decline is not an offer), so other lenders still
   *  see it and the borrower isn't misled into thinking an offer arrived. */
  async decline(lenderId: string, dto: any): Promise<Quote> {
    await this.assertOwnLoanRequest(lenderId, dto?.inquiryId);
    const quote = await this.quotesService.create(
      {
        inquiryId: dto.inquiryId,
        inquiryTitle: dto.inquiryTitle || 'Loan Request',
        providerId: lenderId,
        providerName: dto.providerName || 'Lender',
        price: 0,
        condition: 'DECLINED',
        message: String(dto.reason || 'Declined'),
        status: 'REJECTED',
        dynamicFields: { declined: true, reason: dto.reason ?? null },
      } as any,
      { skipInquiryTransition: true },
    );
    this.audit({
      action: 'LOAN_REQUEST_DECLINED',
      entityType: 'QUOTE',
      entityId: quote.id,
      providerId: lenderId,
      targetTitle: quote.inquiryTitle,
      reason: String(dto.reason || ''),
      status: 'REJECTED',
      details: 'Lender declined the loan request',
    });
    return quote;
  }

  /** Revise an offer (lender/owner only) — also resolves any buyer counter. */
  async reviseOffer(lenderId: string, quoteId: string, dto: any): Promise<Quote> {
    const quote = await this.quotes.findOne({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Offer not found');
    if (quote.providerId !== lenderId) throw new ForbiddenException('Not your offer');
    const { price, message, ...terms } = dto;
    const patch: any = {};
    if (price !== undefined) patch.price = Number(price) || 0;
    if (message !== undefined) patch.message = String(message);
    const existing = quote.dynamicFields || {};
    const merged: any = { ...existing, ...terms };
    // Responding to the buyer's counter marks it resolved.
    if (existing.counter && !existing.counter.resolved) {
      merged.counter = { ...existing.counter, resolved: true };
    }
    if (Object.keys(terms).length || (existing.counter && !existing.counter.resolved)) {
      patch.dynamicFields = merged;
    }
    if (Object.keys(patch).length) await this.quotes.update(quoteId, patch);
    this.audit({
      action: 'LOAN_OFFER_REVISED',
      entityType: 'QUOTE',
      entityId: quoteId,
      providerId: lenderId,
      targetTitle: quote.inquiryTitle,
      amount: patch.price ?? (Number(quote.price) || 0),
      details: 'Lender revised the loan offer',
    });
    return this.quotes.findOne({ where: { id: quoteId } });
  }

  // Post-acceptance loan lifecycle — stored on dynamicFields.stage (no new
  // enum/table). Forward-only: ACCEPTED → CONTACTED → VERIFIED → DISBURSED →
  // COMPLETED. Drives the borrower's "What happens next" tracker live.
  private static readonly STAGE_ORDER = [
    'ACCEPTED',
    'CONTACTED',
    'VERIFIED',
    'DISBURSED',
    'COMPLETED',
  ];

  /** Lender advances an ACCEPTED loan to the next lifecycle stage. */
  async advanceStage(lenderId: string, quoteId: string, stage: string): Promise<Quote> {
    const target = String(stage || '').toUpperCase();
    const order = LoanService.STAGE_ORDER;
    if (!order.includes(target) || target === 'ACCEPTED') {
      throw new BadRequestException('Invalid loan stage');
    }
    const quote = await this.quotes.findOne({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Offer not found');
    if (quote.providerId !== lenderId) throw new ForbiddenException('Not your offer');
    if ((quote as any).condition !== 'LOAN') {
      throw new BadRequestException('Not a loan offer');
    }
    if (quote.status !== 'ACCEPTED') {
      throw new ForbiddenException('The borrower must accept the offer before you can progress it');
    }
    // Purchase-financing loans must disburse through the financing settlement
    // (which funds the financed product order's escrow), never a bare stage
    // bump here — that would mark the loan DISBURSED while the seller is never
    // paid. Send the lender to the financing confirm endpoint instead.
    if (target === 'DISBURSED' && quote.inquiryId) {
      const inquiry = await this.inquiriesService.findOne(quote.inquiryId);
      if ((inquiry as any)?.attributes?.financedQuoteId) {
        throw new BadRequestException(
          'This is a purchase-financing loan — confirm disbursement via ' +
            '/financing/offers/:id/confirm-disbursement so the product order is funded',
        );
      }
    }
    const d = quote.dynamicFields || {};
    const current = d.stage || 'ACCEPTED';
    // Forward-only; allow only single-step or later, never backward.
    if (order.indexOf(target) <= order.indexOf(current)) {
      throw new ForbiddenException(`Loan is already at "${current}" — cannot move back to "${target}"`);
    }
    const stageAt = { ...(d.stageAt || {}), [target.toLowerCase()]: new Date().toISOString() };
    const merged: any = { ...d, stage: target, stageAt };
    await this.quotes.update(quoteId, { dynamicFields: merged });
    this.audit({
      action: `LOAN_${target}`,
      entityType: 'QUOTE',
      entityId: quoteId,
      providerId: lenderId,
      targetTitle: quote.inquiryTitle,
      amount: Number(quote.price) || 0,
      status: target,
      details: `Lender marked the loan ${target.toLowerCase()}`,
    });
    return this.quotes.findOne({ where: { id: quoteId } });
  }
}
