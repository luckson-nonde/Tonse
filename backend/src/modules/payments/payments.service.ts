import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  /**
   * Record a payment. Pass the caller's `manager` to enlist this write in their
   * transaction — money records must commit atomically with the state change
   * that caused them (e.g. an escrow release must not persist if the quote's
   * COMPLETED write rolls back, and vice versa). Without it this repository
   * runs on its own connection and would silently escape the caller's rollback.
   */
  async create(createPaymentDto: CreatePaymentDto, manager?: EntityManager): Promise<Payment> {
    const repo = manager ? manager.getRepository(Payment) : this.paymentsRepository;
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const netAmount = createPaymentDto.amount - (createPaymentDto.fee || 0);
    const payment = repo.create({
      ...createPaymentDto,
      transactionId,
      netAmount,
    });
    return repo.save(payment);
  }

  async findAll(filters: any = {}): Promise<{ data: Payment[]; total: number }> {
    const queryBuilder = this.paymentsRepository.createQueryBuilder('payment');

    if (filters.userId) {
      queryBuilder.andWhere('payment.userId = :userId', { userId: filters.userId });
    }

    if (filters.type) {
      queryBuilder.andWhere('payment.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters.search) {
      queryBuilder.andWhere('payment.transactionId ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`payment.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Payment> {
    return this.paymentsRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    await this.paymentsRepository.update(id, updatePaymentDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.paymentsRepository.delete(id);
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Payments of a given type. `userId` scopes the read to one party — the
   *  controller passes it for everyone except ADMIN, so a caller can't read
   *  the whole platform's payments of a type. */
  async findByType(type: string, userId?: string): Promise<Payment[]> {
    const where: Record<string, any> = { type };
    if (userId) where.userId = userId;
    return this.paymentsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string, processedAt?: Date): Promise<Payment> {
    await this.paymentsRepository.update(id, { status, processedAt: processedAt || new Date() });
    return this.findOne(id);
  }

  async findByExternalReference(externalReference: string): Promise<Payment> {
    return this.paymentsRepository.findOne({
      where: { externalReference },
    });
  }
}
