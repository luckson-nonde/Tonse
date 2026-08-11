import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ESCROW_HOLDING_STATUSES } from '../quotes/quote-status';
import { FunnelTrackingService } from '../referrals/services/funnel-tracking.service';
import { UsersService } from '../users/users.service';
import { resolveSortField, resolveSortOrder } from '../../utils/safe-sort.util';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'totalAmount', 'status', 'deliveryDate', 'orderNumber'] as const;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly funnelTrackingService: FunnelTrackingService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Refuse to destroy an order whose quote still holds the buyer's money.
   * Deleting the order doesn't move the money — it just orphans the escrow
   * position (quote stays PAID with nothing pointing at it), which is how
   * buyers ended up permanently blocked from deleting their own account.
   */
  async assertNoEscrowHeld(orderId: string): Promise<void> {
    const rows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(*) AS count
         FROM orders o JOIN quotes q ON q.id = o."quoteId"
        WHERE o.id = $1 AND q.status::text = ANY($2)`,
      [orderId, [...ESCROW_HOLDING_STATUSES]],
    );
    if (Number(rows[0]?.count || 0) > 0) {
      throw new ConflictException(
        'This order has funds held in escrow and cannot be deleted. ' +
          'Cancel the order to have the money refunded instead.',
      );
    }
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // PAYMENT BYPASS GUARD. This endpoint used to be the de-facto "convert
    // quote to order" for the buyer UIs, which meant any client could flip a
    // quote to PAID — a money status — without a single ngwee moving. Paid
    // orders are now created ONLY by CheckoutService.fundEscrow after the PSP
    // verifies the payment. What legitimately remains here: zero-priced deals
    // and LOAN offers (a loan acceptance has no buyer-pays step — the money
    // flows lender→escrow later through the disbursement checkout).
    if (createOrderDto.quoteId && Number(createOrderDto.totalAmount) > 0) {
      const quote = await this.dataSource.getRepository(Quote).findOne({
        where: { id: createOrderDto.quoteId },
        select: ['id', 'condition'],
      });
      if (quote && quote.condition !== 'LOAN') {
        throw new ForbiddenException(
          'Paid orders are created by the payment flow — pay the quote to generate its order.',
        );
      }
    }

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

    const sortField = resolveSortField(filters.sort, SORTABLE_FIELDS, 'createdAt');
    const sortOrder = resolveSortOrder(filters.order);
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
    const orders = await this.ordersRepository.find({
      where: { buyerId },
      relations: ['quote', 'quote.inquiry', 'seller'],
      order: { createdAt: 'DESC' },
    });
    return this.attachCounterpartyNames(orders, 'seller');
  }

  async findBySeller(sellerId: string): Promise<Order[]> {
    const orders = await this.ordersRepository.find({
      where: { sellerId },
      relations: ['quote', 'quote.inquiry', 'buyer'],
      order: { createdAt: 'DESC' },
    });
    return this.attachCounterpartyNames(orders, 'buyer');
  }

  /**
   * The raw User relation carries no display name (names live on the
   * profile tables; users.name is the ADMIN carve-out), so the wire shape's
   * long-declared buyer/seller fullName/businessName arrived undefined.
   * Batch-resolve real names and graft them onto the loaded relation.
   */
  private async attachCounterpartyNames(
    orders: Order[],
    side: 'buyer' | 'seller',
  ): Promise<Order[]> {
    const idOf = (o: Order) => (side === 'buyer' ? o.buyerId : o.sellerId);
    const ids = Array.from(new Set(orders.map(idOf).filter(Boolean)));
    if (ids.length === 0) return orders;

    const identity = await this.usersService.resolveDisplayIdentities(ids);
    for (const o of orders) {
      const name = identity.get(idOf(o))?.name;
      if (!name) continue;
      const existing: any = (o as any)[side] ?? { id: idOf(o) };
      (o as any)[side] = {
        ...existing,
        fullName: existing.fullName ?? name,
        businessName: existing.businessName ?? name,
      };
    }
    return orders;
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
