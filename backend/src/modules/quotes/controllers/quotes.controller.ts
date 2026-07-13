import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { QuotesService } from '../quotes.service';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions';
import { InquiriesService } from '../../inquiries/inquiries.service';
import { AuditService } from '../../audit/audit.service';

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    parentProviderId?: string | null;
    permissions?: string[];
  };
}

/**
 * Quotes surface. Guarded by MANAGE_QUOTES: owners + buyers bypass the guard
 * (no parentProviderId), staff need the permission. Providers act on quotes as
 * their shop — `providerScope` resolves a staff caller to their parent owner,
 * so a Quotation Manager's quotes belong to the shop (create AND read).
 */
@Controller('quotes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.MANAGE_QUOTES)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly inquiriesService: InquiriesService,
    private readonly auditService: AuditService
  ) {}

  /** The shop a caller acts on for quotes: staff act as their parent owner. */
  private providerScope(req: AuthenticatedRequest): string {
    return req.user.parentProviderId ?? req.user.id;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createQuoteDto: CreateQuoteDto, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Quotes are always created for the authenticated provider's shop
    // (staff create on behalf of their parent owner, not under their own id).
    createQuoteDto.providerId = this.providerScope(req);
    return this.quotesService.create(createQuoteDto);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Users can only see quotes relevant to them
    // Buyers see quotes for their inquiries, providers see their own quotes
    const filters = {
      ...query,
      userId: this.providerScope(req), // shop scope; staff → parent owner
    };
    return this.quotesService.findAll(filters);
  }

  @Get('inquiry/:inquiryId')
  async findByInquiry(@Param('inquiryId') inquiryId: string, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Only the buyer of the inquiry can view its quotes
    const inquiry = await this.inquiriesService.findOne(inquiryId);
    if (!inquiry) {
      throw new ForbiddenException('Inquiry not found');
    }
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only view quotes for your own inquiries');
    }
    const quotes = await this.quotesService.findByInquiry(inquiryId, req.user.id);
    return quotes;
  }

  @Get('provider/:providerId')
  async findByProvider(
    @Param('providerId') providerId: string,
    @Request() req: AuthenticatedRequest
  ) {
    // ENFORCE: Users can only view their own shop's provider quotes
    if (providerId !== this.providerScope(req)) {
      throw new ForbiddenException('You can only view your own quotes');
    }
    return this.quotesService.findByProvider(providerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the buyer or provider of the quote can view it
    if (quote) {
      const hasAccess =
        quote.providerId === this.providerScope(req) || // Provider's shop
        quote.inquiry?.buyerId === req.user.id; // Buyer of the inquiry
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this quote');
      }
    }
    return quote;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @Request() req: AuthenticatedRequest
  ) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the provider who created the quote can update it
    if (quote.providerId !== this.providerScope(req)) {
      throw new ForbiddenException('You can only update your own quotes');
    }
    return this.quotesService.update(id, updateQuoteDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status:
        | 'PENDING'
        | 'ACCEPTED'
        | 'REJECTED'
        | 'ARCHIVED'
        | 'PAID'
        | 'PENDING_COLLECTION'
        | 'AWAITING_PICKUP'
        | 'COMPLETED'
        | 'HANDED_OVER';
    },
    @Request() req: AuthenticatedRequest
  ) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Buyer can accept/reject, Provider can update status
    const hasAccess =
      quote.providerId === this.providerScope(req) || quote.inquiry?.buyerId === req.user.id;
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this quote');
    }
    const result = await this.quotesService.updateStatus(id, body.status);
    // Audit borrower decisions on a LOAN offer so both sides have a trail.
    if (
      (quote as any).condition === 'LOAN' &&
      quote.inquiry?.buyerId === req.user.id &&
      (body.status === 'ACCEPTED' || body.status === 'REJECTED')
    ) {
      await this.auditService
        .create({
          action: body.status === 'ACCEPTED' ? 'LOAN_OFFER_ACCEPTED' : 'LOAN_OFFER_REJECTED',
          entityType: 'QUOTE',
          entityId: id,
          providerId: quote.providerId,
          targetTitle: quote.inquiryTitle,
          amount: Number((quote as any).price) || 0,
          status: body.status,
          details: `Borrower ${body.status === 'ACCEPTED' ? 'accepted' : 'declined'} the loan offer`,
        })
        .catch(() => undefined);
    }
    return result;
  }

  /**
   * Buyer counter-offer on a loan offer. Stores the buyer's proposed terms on
   * the quote's dynamicFields (negotiation stays PENDING) so the lender can
   * revise. Buyer-authorized; buyers bypass the MANAGE_QUOTES guard.
   */
  @Patch(':id/counter')
  async counter(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: AuthenticatedRequest
  ) {
    const quote = await this.quotesService.findOne(id);
    if (quote?.inquiry?.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only counter offers on your own request');
    }
    const counter = {
      requestedAmount: body?.requestedAmount != null ? Number(body.requestedAmount) : null,
      maxInterestRatePct: body?.maxInterestRatePct != null ? Number(body.maxInterestRatePct) : null,
      requestedTenure: body?.requestedTenure || null,
      note: String(body?.note || ''),
      at: new Date().toISOString(),
      resolved: false,
    };
    const result = await this.quotesService.saveCounter(id, counter);
    await this.auditService
      .create({
        action: 'LOAN_OFFER_COUNTERED',
        entityType: 'QUOTE',
        entityId: id,
        providerId: quote.providerId,
        targetTitle: quote.inquiryTitle,
        amount: counter.requestedAmount ?? (Number((quote as any).price) || 0),
        details: 'Borrower submitted a counter-offer',
        reason: counter.note,
      })
      .catch(() => undefined);
    return result;
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the buyer can mark as read
    if (quote.inquiry?.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only mark your own quotes as read');
    }
    return this.quotesService.markAsRead(id);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the buyer can archive quotes
    if (quote.inquiry?.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only archive your own quotes');
    }
    return this.quotesService.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the provider who created the quote can delete it
    if (quote.providerId !== this.providerScope(req)) {
      throw new ForbiddenException('You can only delete your own quotes');
    }
    await this.quotesService.remove(id);
  }
}
