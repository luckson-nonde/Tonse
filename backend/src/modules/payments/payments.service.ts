import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const netAmount = createPaymentDto.amount - (createPaymentDto.fee || 0);
    const payment = this.paymentsRepository.create({
      ...createPaymentDto,
      transactionId,
      netAmount,
    });
    return this.paymentsRepository.save(payment);
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

  async findByType(type: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { type },
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
