import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ESCROW_HOLDING_STATUSES } from '../quotes/quote-status';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
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
    return this.dataSource.transaction(async (m) => {
      const order = await m.getRepository(Order).save(
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

      return order;
    });
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
    return this.findOne(id);
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
