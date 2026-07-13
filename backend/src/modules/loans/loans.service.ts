import {
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
  ) {}

  private audit(entry: Record<string, any>) {
    return this.auditService.create(entry as any).catch(() => undefined);
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

  /** Decline a request — a REJECTED Quote carrying the reason. */
  async decline(lenderId: string, dto: any): Promise<Quote> {
    const quote = await this.quotesService.create({
      inquiryId: dto.inquiryId,
      inquiryTitle: dto.inquiryTitle || 'Loan Request',
      providerId: lenderId,
      providerName: dto.providerName || 'Lender',
      price: 0,
      condition: 'DECLINED',
      message: String(dto.reason || 'Declined'),
      status: 'REJECTED',
      dynamicFields: { declined: true, reason: dto.reason ?? null },
    } as any);
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
}
