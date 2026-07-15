import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { resolveSortField, resolveSortOrder } from '../../utils/safe-sort.util';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'date', 'startTime', 'status', 'title'] as const;

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private schedulesRepository: Repository<Schedule>,
  ) {}

  async create(createScheduleDto: CreateScheduleDto): Promise<Schedule> {
    const schedule = this.schedulesRepository.create(createScheduleDto);
    return this.schedulesRepository.save(schedule);
  }

  async findAll(filters: any = {}): Promise<{ data: Schedule[]; total: number }> {
    const queryBuilder = this.schedulesRepository.createQueryBuilder('schedule');

    if (filters.userId) {
      queryBuilder.andWhere('schedule.userId = :userId', { userId: filters.userId });
    }

    if (filters.type) {
      queryBuilder.andWhere('schedule.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('schedule.status = :status', { status: filters.status });
    }

    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere('schedule.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const sortField = resolveSortField(filters.sort, SORTABLE_FIELDS, 'date');
    const sortOrder = resolveSortOrder(filters.order, 'ASC');
    queryBuilder.orderBy(`schedule.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Schedule> {
    return this.schedulesRepository.findOne({ where: { id } });
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto): Promise<Schedule> {
    await this.schedulesRepository.update(id, updateScheduleDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.schedulesRepository.delete(id);
  }

  async findByUser(userId: string): Promise<Schedule[]> {
    return this.schedulesRepository.find({
      where: { userId },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findByDateRange(userId: string, dateFrom: Date, dateTo: Date): Promise<Schedule[]> {
    const queryBuilder = this.schedulesRepository.createQueryBuilder('schedule');
    queryBuilder
      .where('schedule.userId = :userId', { userId })
      .andWhere('schedule.date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .orderBy('schedule.date', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC');
    return queryBuilder.getMany();
  }

  async updateStatus(id: string, status: string): Promise<Schedule> {
    await this.schedulesRepository.update(id, { status });
    return this.findOne(id);
  }
}
