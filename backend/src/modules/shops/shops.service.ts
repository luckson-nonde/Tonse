import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './entities/shop.entity';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopsRepository: Repository<Shop>,
  ) {}

  async create(createShopDto: CreateShopDto): Promise<Shop> {
    const shop = this.shopsRepository.create(createShopDto);
    return this.shopsRepository.save(shop);
  }

  async findAll(filters: any = {}): Promise<{ data: Shop[]; total: number }> {
    const queryBuilder = this.shopsRepository.createQueryBuilder('shop');

    if (filters.search) {
      queryBuilder.andWhere(
        '(shop.name ILIKE :search OR shop.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('shop.isActive = :isActive', { isActive: filters.isActive });
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`shop.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Shop> {
    return this.shopsRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateShopDto: UpdateShopDto): Promise<Shop> {
    await this.shopsRepository.update(id, updateShopDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.shopsRepository.delete(id);
  }

  async findBySellerId(sellerId: string): Promise<Shop> {
    return this.shopsRepository.findOne({
      where: { sellerId },
    });
  }

  async updateRating(id: string, rating: number, reviewCount: number): Promise<Shop> {
    await this.shopsRepository.update(id, { rating, reviewCount });
    return this.findOne(id);
  }

  async incrementFollowerCount(id: string): Promise<Shop> {
    const shop = await this.findOne(id);
    if (shop) {
      await this.shopsRepository.update(id, {
        followerCount: shop.followerCount + 1,
      });
    }
    return this.findOne(id);
  }

  async decrementFollowerCount(id: string): Promise<Shop> {
    const shop = await this.findOne(id);
    if (shop && shop.followerCount > 0) {
      await this.shopsRepository.update(id, {
        followerCount: shop.followerCount - 1,
      });
    }
    return this.findOne(id);
  }
}
