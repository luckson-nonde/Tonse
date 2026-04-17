import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'name', 'role'],
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { refreshToken },
    );
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { refreshToken: null },
    );
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.usersRepository.update({ id }, updateUserDto);
    return this.findById(id);
  }

  async findAll(filters: any = {}): Promise<{ data: User[]; total: number }> {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (filters.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.verificationStatus) {
      queryBuilder.andWhere('user.verificationStatus = :verificationStatus', {
        verificationStatus: filters.verificationStatus,
      });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete({ id });
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { lastLoginAt: new Date() },
    );
  }
}
