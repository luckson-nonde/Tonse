import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

/**
 * Shares the `shops` route prefix with ShopsController — no collision:
 * its `@Get(':id')` matches exactly one segment and `:id/profile` needs a
 * literal second segment, while these routes end in the literal `reviews`.
 * :sellerUserId is the provider's users.id (ShopResult.sellerId).
 */
@Controller('shops')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':sellerUserId/reviews')
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: any,
    @Param('sellerUserId') sellerUserId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, sellerUserId, dto);
  }

  /** Public — anyone browsing a shop profile can read its reviews. */
  @Get(':sellerUserId/reviews')
  async findForShop(
    @Param('sellerUserId') sellerUserId: string,
    @Query() query: Record<string, any>,
  ) {
    return this.reviewsService.findForShop(sellerUserId, query);
  }
}
