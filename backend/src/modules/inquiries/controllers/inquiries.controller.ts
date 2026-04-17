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
import { InquiriesService } from '../inquiries.service';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { UpdateInquiryDto } from '../dto/update-inquiry.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user?: { id: string; email: string; role: string };
}

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createInquiryDto: CreateInquiryDto, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Inquiries are always created by the authenticated user
    if (!req.user?.id) throw new ForbiddenException('User not authenticated');
    createInquiryDto.buyerId = req.user.id;
    return this.inquiriesService.create(createInquiryDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any, @Request() req: AuthenticatedRequest) {
    const filters = {
      buyerId: req.user.id, // ENFORCE: User can only see their own inquiries
      status: query.status,
      category: query.category,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };

    return this.inquiriesService.findAll(filters);
  }

  @Get('buyer/:buyerId')
  @UseGuards(JwtAuthGuard)
  async findByBuyer(@Param('buyerId') buyerId: string, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Users can only query their own inquiries
    if (buyerId !== req.user.id) {
      throw new ForbiddenException('You can only view your own inquiries');
    }
    return this.inquiriesService.findByBuyerId(buyerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const inquiry = await this.inquiriesService.findOne(id);
    // ENFORCE: Users can only view their own inquiries
    if (inquiry && inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only view your own inquiries');
    }
    return inquiry;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateInquiryDto: UpdateInquiryDto,
    @Request() req: AuthenticatedRequest
  ) {
    const inquiry = await this.inquiriesService.findOne(id);
    // ENFORCE: Users can only update their own inquiries
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own inquiries');
    }
    return this.inquiriesService.update(id, updateInquiryDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'OPEN' | 'CLOSED' },
    @Request() req: AuthenticatedRequest
  ) {
    const inquiry = await this.inquiriesService.findOne(id);
    // ENFORCE: Users can only update their own inquiries
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own inquiries');
    }
    return this.inquiriesService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const inquiry = await this.inquiriesService.findOne(id);
    // ENFORCE: Users can only delete their own inquiries
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own inquiries');
    }
    await this.inquiriesService.remove(id);
  }
}
