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

interface AuthenticatedRequest extends ExpressRequest {
  user?: { id: string; email: string; role: string };
}

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createQuoteDto: CreateQuoteDto, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Quotes are always created by the authenticated provider
    createQuoteDto.providerId = req.user.id;
    return this.quotesService.create(createQuoteDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Users can only see quotes relevant to them
    // Buyers see quotes for their inquiries, providers see their own quotes
    const filters = {
      userId: req.user.id, // Pass the user ID for authorization check in service
      inquiryId: query.inquiryId,
      providerId: query.providerId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };
    return this.quotesService.findAll(filters);
  }

  @Get('inquiry/:inquiryId')
  @UseGuards(JwtAuthGuard)
  async findByInquiry(@Param('inquiryId') inquiryId: string, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Only the buyer of the inquiry can view its quotes
    const quotes = await this.quotesService.findByInquiry(inquiryId, req.user.id);
    return quotes;
  }

  @Get('provider/:providerId')
  @UseGuards(JwtAuthGuard)
  async findByProvider(@Param('providerId') providerId: string, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Users can only view their own provider quotes
    if (providerId !== req.user.id) {
      throw new ForbiddenException('You can only view your own quotes');
    }
    return this.quotesService.findByProvider(providerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the buyer or provider of the quote can view it
    if (quote) {
      const hasAccess =
        quote.providerId === req.user.id || // Provider who created it
        quote.inquiry?.buyerId === req.user.id; // Buyer of the inquiry
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this quote');
      }
    }
    return quote;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @Request() req: AuthenticatedRequest
  ) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the provider who created the quote can update it
    if (quote.providerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own quotes');
    }
    return this.quotesService.update(id, updateQuoteDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
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
    const hasAccess = quote.providerId === req.user.id || quote.inquiry?.buyerId === req.user.id;
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this quote');
    }
    return this.quotesService.updateStatus(id, body.status);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the buyer can mark as read
    if (quote.inquiry?.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only mark your own quotes as read');
    }
    return this.quotesService.markAsRead(id);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard)
  async archive(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the buyer can archive quotes
    if (quote.inquiry?.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only archive your own quotes');
    }
    return this.quotesService.archive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const quote = await this.quotesService.findOne(id);
    // ENFORCE: Only the provider who created the quote can delete it
    if (quote.providerId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own quotes');
    }
    await this.quotesService.remove(id);
  }
}
