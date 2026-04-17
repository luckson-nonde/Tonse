import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private quotesRepository: Repository<Quote>,
  ) {}

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    const quote = this.quotesRepository.create(createQuoteDto);
    return this.quotesRepository.save(quote);
  }

  async findAll(filters: any = {}): Promise<{ data: Quote[]; total: number }> {
    const queryBuilder = this.quotesRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.inquiry', 'inquiry');

    // DATA ISOLATION: Filter by user (buyer or provider)
    if (filters.userId) {
      queryBuilder.andWhere(
        '(quote.providerId = :userId OR inquiry.buyerId = :userId)',
        { userId: filters.userId },
      );
    }

    if (filters.inquiryId) {
      queryBuilder.andWhere('quote.inquiryId = :inquiryId', {
        inquiryId: filters.inquiryId,
      });
    }

    if (filters.providerId) {
      queryBuilder.andWhere('quote.providerId = :providerId', {
        providerId: filters.providerId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('quote.status = :status', { status: filters.status });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(quote.providerName ILIKE :search OR quote.inquiryTitle ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`quote.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Quote> {
    return this.quotesRepository.findOne({
      where: { id },
      relations: ['inquiry'], // Load inquiry to check buyerId
    });
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    await this.quotesRepository.update(id, updateQuoteDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.quotesRepository.delete(id);
  }

  async findByInquiry(inquiryId: string, userId: string): Promise<Quote[]> {
    // This will be used by controller that validates user is the buyer
    return this.quotesRepository.find({
      where: { inquiryId },
      relations: ['inquiry'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProvider(providerId: string): Promise<Quote[]> {
    return this.quotesRepository.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string): Promise<Quote> {
    await this.quotesRepository.update(id, { status });
    return this.findOne(id);
  }

  async markAsRead(id: string): Promise<Quote> {
    await this.quotesRepository.update(id, { isRead: true });
    return this.findOne(id);
  }

  async archive(id: string): Promise<Quote> {
    await this.quotesRepository.update(id, { isArchived: true });
    return this.findOne(id);
  }
}
