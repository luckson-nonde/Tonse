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
  NotFoundException,
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
import { MatchingService } from '../services/matching.service';
import { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user?: { id: string; email: string; role: string; parentProviderId?: string | null };
}

@Controller('inquiries')
export class InquiriesController {
  constructor(
    private readonly inquiriesService: InquiriesService,
    private readonly inquiryImagesService: InquiryImagesService,
    private readonly matchingService: MatchingService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Server-side, ID-based, hierarchy-aware leads matching for the
   * authenticated provider. Reads the active profile pointer off the
   * user, walks down the category tree from the seller's chosen
   * categories, and returns inquiries tagged with any descendant id.
   *
   * Replaces the previous client-side filter where the frontend pulled
   * every OPEN inquiry and ran name-substring matching in the browser.
   */
  @Get('leads/me')
  @UseGuards(JwtAuthGuard)
  async leadsForMe(@Query() query: any, @Request() req: AuthenticatedRequest) {
    if (!req.user?.id) throw new ForbiddenException('User not authenticated');
    const caller = await this.usersService.findById(req.user.id);
    if (!caller) throw new ForbiddenException('User not found');

    // Stage 1 (team auth): staff (parentProviderId set) match against
    // the PARENT provider's profile, not their own minimal contact
    // profile. Their own profile carries no categories or archetypes.
    const profileOwner =
      caller.parentProviderId
        ? (await this.usersService
            .findById(caller.parentProviderId)
            .catch(() => null)) ?? caller
        : caller;

    if (!profileOwner.activeProfileId || !profileOwner.activeProfileType) {
      // No business profile yet — buyers / freshly-bootstrapped users.
      return { data: [], total: 0, matchedCategoryIds: [] };
    }
    if (
      profileOwner.activeProfileType !== 'SELLER' &&
      profileOwner.activeProfileType !== 'SERVICE_PROVIDER'
    ) {
      return { data: [], total: 0, matchedCategoryIds: [] };
    }
    // Variant resolution: staff with assignedArchetype set are LOCKED
    // to that variant — their query string can't override it. Owners
    // (no assignedArchetype) honour ?variant= from the toggle, or
    // omit it for "all variants".
    const variant = caller.assignedArchetype || query?.variant || undefined;

    return this.matchingService.findLeadsForProfile(
      {
        type: profileOwner.activeProfileType as 'SELLER' | 'SERVICE_PROVIDER',
        profileId: profileOwner.activeProfileId,
      },
      {
        status: query?.status,
        city: query?.city,
        province: query?.province,
        page: query?.page,
        limit: query?.limit,
        variant,
        providerUserId: profileOwner.id,
      },
      // Dispatch notifications are addressed to the profile OWNER's userId
      // (reverse matching resolves profiles → owner), so staff callers see
      // the owner's Accept/Decline state — consistent with them matching
      // against the owner's profile above.
      profileOwner.id,
    );
  }

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

    // ENFORCE RBAC. Buyers strictly see their own inquiries — buyerId is
    // pinned to the JWT subject regardless of what they passed.
    if (req.user.role === 'BUYER') {
      filters.buyerId = req.user.id;
      return this.inquiriesService.findAll(filters);
    }

    // ADMIN gets the global feed (audit / verification queue).
    if (req.user.role === 'ADMIN') {
      return this.inquiriesService.findAll(filters);
    }

    // SELLER / SERVICE_PROVIDER must NOT use the unfiltered feed — the
    // category-aware matched view at GET /inquiries/leads/me is the
    // canonical visibility surface for them. Returning the whole
    // inquiries table here was the leak that let two unrelated sellers
    // see the same three inquiries on their dashboard regardless of
    // category. Refuse and steer.
    if (!filters.buyerId) {
      throw new ForbiddenException(
        'Sellers and service providers must use GET /inquiries/leads/me for category-matched leads.',
      );
    }
    // Caller passed an explicit buyerId — only allow if it's their own
    // (buyers fetching their own through this path) or admin (handled
    // above). Anyone else is fishing.
    if (filters.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only filter inquiries by your own buyerId.');
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
    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }
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
    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }
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
    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only delete images from your own inquiries');
    }

    await this.inquiryImagesService.deleteImage(inquiryId, imageId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const inquiry = await this.inquiriesService.findOne(id);
    if (!inquiry) return inquiry;
    // ENFORCE RBAC: this returns the RAW inquiry (attributes with contact PII,
    // exact location, buyerId), so lock it down. Previously any non-buyer could
    // read ANY inquiry by id — an IDOR that leaked borrower PII and defeated the
    // targetedProviderId model. Allow only: the owner, an ADMIN, or the
    // specifically-targeted provider. (Providers get their matched leads via
    // GET /inquiries/leads/me, which withholds contact PII.)
    const isOwner = inquiry.buyerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      const scope = req.user.parentProviderId ?? req.user.id;
      const target = (inquiry as any).targetedProviderId;
      if (!target || target !== scope) {
        throw new ForbiddenException('You do not have access to this inquiry');
      }
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

  /**
   * Buyer surfaces the RESERVE quote batch ("didn't find what I needed in
   * the first N quotes — show me the extras"). Ownership enforced in the
   * service; idempotent.
   */
  @Patch(':id/release-reserve')
  @UseGuards(JwtAuthGuard)
  async releaseReserve(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.inquiriesService.releaseReserve(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateInquiryDto: UpdateInquiryDto,
    @Request() req: AuthenticatedRequest
  ) {
    const inquiry = await this.inquiriesService.findOne(id);
    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${id} not found`);
    }
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
    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${id} not found`);
    }
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
    // 404 when the row doesn't exist (already deleted, stale UI cache,
    // or wrong id sent). Without this guard the next line dereferenced
    // null and the controller crashed with a 500 + raw "Cannot read
    // properties of null (reading 'buyerId')" leaking the stack to
    // the client.
    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${id} not found`);
    }
    // ENFORCE: Users can only delete their own inquiries
    if (inquiry.buyerId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own inquiries');
    }
    await this.inquiriesService.remove(id);
  }
}
