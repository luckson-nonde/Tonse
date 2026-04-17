import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { CreateInquiryDto, UpdateInquiryDto } from './dto';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiriesRepository: Repository<Inquiry>,
  ) {}

  async create(createInquiryDto: CreateInquiryDto): Promise<Inquiry> {
    const inquiry = this.inquiriesRepository.create(createInquiryDto);
    return await this.inquiriesRepository.save(inquiry);
  }

  async findAll(filters: any = {}): Promise<{ data: Inquiry[]; total: number }> {
    const queryBuilder = this.inquiriesRepository.createQueryBuilder('inquiry');

    // Apply filters
    if (filters.buyerId) {
      queryBuilder.andWhere('inquiry.buyerId = :buyerId', { buyerId: filters.buyerId });
    }

    if (filters.status) {
      queryBuilder.andWhere('inquiry.status = :status', { status: filters.status });
    }

    if (filters.category) {
      queryBuilder.andWhere('inquiry.category = :category', { category: filters.category });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(inquiry.title ILIKE :search OR inquiry.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Sorting
    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`inquiry.${sortField}`, sortOrder as any);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Inquiry> {
    return await this.inquiriesRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateInquiryDto: UpdateInquiryDto): Promise<Inquiry> {
    await this.inquiriesRepository.update(id, updateInquiryDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.inquiriesRepository.delete(id);
  }

  async findByBuyerId(buyerId: string): Promise<Inquiry[]> {
    return await this.inquiriesRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string): Promise<Inquiry> {
    return await this.update(id, { status } as UpdateInquiryDto);
  }
}
