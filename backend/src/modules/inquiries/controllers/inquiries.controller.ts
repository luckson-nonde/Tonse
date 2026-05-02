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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request as ExpressRequest } from 'express';
import { InquiriesService } from '../inquiries.service';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { UpdateInquiryDto } from '../dto/update-inquiry.dto';
import { InquiryImagesService } from '../services/inquiry-images.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user?: { id: string; email: string; role: string };
}

@Controller('inquiries')
export class InquiriesController {
  constructor(
    private readonly inquiriesService: InquiriesService,
    private readonly inquiryImagesService: InquiryImagesService
  ) {}

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
      ...query,
    };

    // ENFORCE RBAC: Buyers strictly see their own inquiries
    if (req.user.role === 'BUYER') {
      filters.buyerId = req.user.id;
    }

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

  /**
   * Get all images for an inquiry
   * GET /inquiries/:id/images
   * NOTE: Must come before @Get(':id') to avoid route conflict
   */
  @Get(':id/images')
  @UseGuards(JwtAuthGuard)
  async getImages(@Param('id') inquiryId: string) {
    const images = await this.inquiryImagesService.getInquiryImages(inquiryId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Images retrieved successfully',
      data: images,
    };
  }

  /**
   * Upload a single image for an inquiry
   * POST /inquiries/:id/images
   */
  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(
    @Param('id') inquiryId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify inquiry ownership
    const inquiry = await this.inquiriesService.findOne(inquiryId);
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only upload images to your own inquiries');
    }

    const image = await this.inquiryImagesService.uploadImage(inquiryId, file);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Image uploaded successfully',
      data: image,
    };
  }

  /**
   * Upload multiple images for an inquiry
   * POST /inquiries/:id/images/multiple
   */
  @Post(':id/images/multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  @HttpCode(HttpStatus.CREATED)
  async uploadMultipleImages(
    @Param('id') inquiryId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: AuthenticatedRequest
  ) {
    // Verify inquiry ownership
    const inquiry = await this.inquiriesService.findOne(inquiryId);
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only upload images to your own inquiries');
    }

    const images = await this.inquiryImagesService.uploadMultipleImages(inquiryId, files);
    return {
      statusCode: HttpStatus.CREATED,
      message: `${images.length} images uploaded successfully`,
      data: images,
    };
  }

  /**
   * Delete an image from an inquiry
   * DELETE /inquiries/:id/images/:imageId
   */
  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(
    @Param('id') inquiryId: string,
    @Param('imageId') imageId: string,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify inquiry ownership
    const inquiry = await this.inquiriesService.findOne(inquiryId);
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only delete images from your own inquiries');
    }

    await this.inquiryImagesService.deleteImage(inquiryId, imageId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const inquiry = await this.inquiriesService.findOne(id);
    // ENFORCE RBAC: Buyers can only view their own inquiries
    if (inquiry && inquiry.buyerId !== req.user.id && req.user.role === 'BUYER') {
      throw new ForbiddenException('You can only view your own inquiries');
    }
    return inquiry;
  }

  /**
   * Records a provider view on this inquiry.
   *
   * Counted ONLY when the viewer is a non-buyer AND not the inquiry owner —
   * mirrors the user's intent that the counter reflects external interest
   * from the provider/service-provider audience, not the buyer reopening
   * their own request. Returns the new count for optimistic UI sync.
   */
  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  async recordView(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const inquiry = await this.inquiriesService.findOne(id);
    if (!inquiry) {
      return { id, viewCount: 0, counted: false, reason: 'inquiry-not-found' };
    }
    const role = req.user?.role;
    const isOwner = inquiry.buyerId === req.user?.id;
    if (role === 'BUYER' || role === 'ADMIN' || isOwner) {
      // No-op: don't pollute the counter with owner re-opens or admin audits.
      return { id, viewCount: inquiry.viewCount, counted: false };
    }
    const newCount = await this.inquiriesService.incrementViewCount(id);
    return { id, viewCount: newCount, counted: true };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateInquiryDto: UpdateInquiryDto,
    @Request() req: AuthenticatedRequest
  ) {
    const inquiry = await this.inquiriesService.findOne(id);
    // ENFORCE: Only the inquiry owner can update it
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
    // ENFORCE: Only the inquiry owner can change its status
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
