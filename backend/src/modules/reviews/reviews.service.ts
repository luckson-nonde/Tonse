import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopReview } from './entities/shop-review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(ShopReview)
    private readonly reviewRepository: Repository<ShopReview>,
  ) {}

  /**
   * A review must be EARNED: the caller needs an order with this provider
   * in DELIVERED or COMPLETED status, and each order can be reviewed once.
   * sellerUserId is the provider's users.id (ShopResult.sellerId — NOT the
   * profile row id; that mixup is a repeat bug class in this codebase).
   */
  async create(
    reviewerUserId: string,
    sellerUserId: string,
    dto: CreateReviewDto,
  ): Promise<ShopReview> {
    if (reviewerUserId === sellerUserId) {
      throw new BadRequestException('You cannot review your own shop');
    }

    const orderRows: Array<{ id: string; status: string }> =
      await this.reviewRepository.query(
        `SELECT id, status FROM orders WHERE id = $1 AND "buyerId" = $2 AND "sellerId" = $3`,
        [dto.orderId, reviewerUserId, sellerUserId],
      );
    const order = orderRows[0];
    if (!order) {
      throw new NotFoundException('No matching order with this shop was found');
    }
    if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new BadRequestException(
        'You can only review a shop after your order is delivered or completed',
      );
    }

    // Friendly pre-check; the unique index (reviewerUserId, orderId) is the
    // real authority — the 23505 catch below closes the double-submit race.
    const existing = await this.reviewRepository.findOne({
      where: { reviewerUserId, orderId: dto.orderId },
    });
    if (existing) {
      throw new ConflictException('You already reviewed this order');
    }

    try {
      const saved = await this.reviewRepository.save(
        this.reviewRepository.create({
          providerUserId: sellerUserId,
          reviewerUserId,
          orderId: dto.orderId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
        }),
      );
      this.logger.log(
        `review.create: ${reviewerUserId} rated ${sellerUserId} ${dto.rating}/5 (order ${dto.orderId})`,
      );
      return saved;
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new ConflictException('You already reviewed this order');
      }
      throw e;
    }
  }

  /** Public review list for a shop, newest first, with the average on top. */
  async findForShop(
    providerUserId: string,
    filters: Record<string, any> = {},
  ): Promise<{ data: any[]; total: number; average: number }> {
    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 10, 50);

    const [rows, aggRows] = await Promise.all([
      this.reviewRepository.query(
        `SELECT sr.id, sr."reviewerUserId", sr."orderId", sr.rating, sr.comment, sr."createdAt",
                COALESCE(bp.name, u."displayId") AS "reviewerName"
         FROM shop_reviews sr
         LEFT JOIN users u           ON u.id = sr."reviewerUserId"
         LEFT JOIN buyer_profiles bp ON bp."userId" = sr."reviewerUserId"
         WHERE sr."providerUserId" = $1
         ORDER BY sr."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [providerUserId, limit, (page - 1) * limit],
      ),
      this.reviewRepository.query(
        // ::float8 / ::int — pg returns numeric/bigint as strings otherwise.
        `SELECT COALESCE(ROUND(AVG(rating)::numeric, 2)::float8, 0) AS average,
                COUNT(*)::int AS total
         FROM shop_reviews WHERE "providerUserId" = $1`,
        [providerUserId],
      ),
    ]);

    return {
      data: rows,
      total: aggRows[0]?.total ?? 0,
      average: aggRows[0]?.average ?? 0,
    };
  }
}
