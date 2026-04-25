import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async findAll(filters: any = {}): Promise<{ data: Product[]; total: number }> {
    const queryBuilder = this.productsRepository.createQueryBuilder('product');

    if (filters.sellerId) {
      queryBuilder.andWhere('product.sellerId = :sellerId', {
        sellerId: filters.sellerId,
      });
    }

    if (filters.category) {
      queryBuilder.andWhere('product.category = :category', {
        category: filters.category,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`product.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Product> {
    return this.productsRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    await this.productsRepository.update(id, updateProductDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.productsRepository.delete(id);
  }

  async findBySeller(sellerId: string): Promise<Product[]> {
    return this.productsRepository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productsRepository.find({
      where: { category },
      order: { createdAt: 'DESC' },
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    const product = await this.findOne(id);
    if (product) {
      await this.productsRepository.update(id, { viewCount: product.viewCount + 1 });
    }
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    if (product) {
      const newStock = Math.max(0, product.stock - quantity);
      await this.productsRepository.update(id, { stock: newStock });
    }
    return this.findOne(id);
  }
}
