import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const order = this.ordersRepository.create({
      ...createOrderDto,
      orderNumber,
    });
    return this.ordersRepository.save(order);
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

  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(sellerId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { sellerId },
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
