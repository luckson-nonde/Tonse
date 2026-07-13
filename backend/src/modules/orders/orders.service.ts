import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FunnelTrackingService } from '../referrals/services/funnel-tracking.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly funnelTrackingService: FunnelTrackingService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // The order is the moment of payment in this app's lifecycle:
    //   • the linked quote moves PENDING → PAID (so it leaves the
    //     buyer's "Received Quotes" surface)
    //   • the linked inquiry moves QUOTED → CLOSED (so it leaves the
    //     buyer's "My Inquiries" surface and stops accepting more quotes)
    // Both cascades ride on the same transaction as the order write —
    // either everything advances or nothing does. Status writes here
    // are server-authoritative; clients shouldn't try to PATCH status
    // separately (and for the buyer they're not authorised to anyway).
    const order = await this.dataSource.transaction(async (m) => {
      const created = await m.getRepository(Order).save(
        m.getRepository(Order).create({ ...createOrderDto, orderNumber }),
      );

      if (createOrderDto.quoteId) {
        await m.getRepository(Quote).update(createOrderDto.quoteId, { status: 'PAID' });
        const quote = await m.getRepository(Quote).findOne({
          where: { id: createOrderDto.quoteId },
          select: ['id', 'inquiryId'],
        });
        if (quote?.inquiryId) {
          await m.getRepository(Inquiry).update(quote.inquiryId, { status: 'CLOSED' });
        }
      }

      return created;
    });

    // Referral funnel: the default status is PENDING, but a direct-complete
    // create is guarded identically to updateStatus. Post-commit.
    if (order.status === 'COMPLETED') {
      this.maybeAdvanceTradeComplete(order);
    }

    return order;
  }

  /**
   * Referral funnel hook (product-trade path). Fires trade_complete for the
   * buyer AND the seller independently — either could be the referred user;
   * each call no-ops unless that id has a conversion row. Fire-and-forget:
   * must never break the order write it rides on.
   */
  private maybeAdvanceTradeComplete(order: Order): void {
    for (const userId of [order.buyerId, order.sellerId]) {
      if (!userId) continue;
      void this.funnelTrackingService
        .advanceStage(userId, 'trade_complete', { type: 'order', id: order.id })
        .catch((e) =>
          this.logger.warn(
            `Referral funnel advance failed for order ${order.id} (user ${userId}): ${(e as Error).message}`,
          ),
        );
    }
  }

  async findAll(filters: any = {}): Promise<{ data: Order[]; total: number }> {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    // DATA ISOLATION: Filter by user (buyer or seller)
    if (filters.userId) {
      queryBuilder.andWhere(
        '(order.buyerId = :userId OR order.sellerId = :userId)',
        { userId: filters.userId },
      );
    }

    if (filters.buyerId) {
      queryBuilder.andWhere('order.buyerId = :buyerId', { buyerId: filters.buyerId });
    }

    if (filters.sellerId) {
      queryBuilder.andWhere('order.sellerId = :sellerId', { sellerId: filters.sellerId });
    }

    if (filters.status) {
      queryBuilder.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.search) {
      queryBuilder.andWhere('order.orderNumber ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`order.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Order> {
    return this.ordersRepository.findOne({
      where: { id },
      relations: ['quote', 'buyer', 'seller'],
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    await this.ordersRepository.update(id, updateOrderDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ordersRepository.delete(id);
  }

  // Eager-load quote + inquiry so the gig calendar can read the date
  // the buyer indicated when raising the inquiry (attributes.eventDate
  // and friends) without a second roundtrip per row. Buyer name is
  // included so the calendar can label the gig.
  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { buyerId },
      relations: ['quote', 'quote.inquiry', 'seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(sellerId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { sellerId },
      relations: ['quote', 'quote.inquiry', 'buyer'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    await this.ordersRepository.update(id, { status });
    const order = await this.findOne(id);
    if (order && status === 'COMPLETED') {
      this.maybeAdvanceTradeComplete(order);
    }
    return order;
  }

  async updateTrackingNumber(id: string, trackingNumber: string): Promise<Order> {
    await this.ordersRepository.update(id, { trackingNumber });
    return this.findOne(id);
  }

  async updateDeliveryDate(id: string, deliveryDate: Date): Promise<Order> {
    await this.ordersRepository.update(id, { deliveryDate });
    return this.findOne(id);
  }
}
