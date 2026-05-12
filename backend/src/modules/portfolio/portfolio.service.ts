import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioItem } from './entities/portfolio-item.entity';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioItem)
    private readonly repo: Repository<PortfolioItem>,
  ) {}

  async findByUser(userId: string): Promise<PortfolioItem[]> {
    return this.repo.find({
      where: { userId },
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PortfolioItem> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Portfolio item ${id} not found`);
    return item;
  }

  async create(userId: string, dto: CreatePortfolioItemDto): Promise<PortfolioItem> {
    const item = this.repo.create({ ...dto, userId });
    return this.repo.save(item);
  }

  async update(id: string, dto: UpdatePortfolioItemDto): Promise<PortfolioItem> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
