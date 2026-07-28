import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent } from './entities/calendar-event.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto';

export interface CalendarEventFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  status?: string;
}

/**
 * Personal calendar entries. Every read/write is scoped to the caller's
 * userId taken from the JWT — a client-supplied userId is never accepted
 * (the legacy schedules module's unscoped findAll is the bug this avoids).
 */
@Injectable()
export class CalendarEventsService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarEventsRepository: Repository<CalendarEvent>,
  ) {}

  async create(userId: string, dto: CreateCalendarEventDto): Promise<CalendarEvent> {
    const event = this.calendarEventsRepository.create({
      ...dto,
      userId,
    });
    return this.calendarEventsRepository.save(event);
  }

  /**
   * The caller's events. Date bounds only filter the BASE date of an event;
   * recurring events (repeatRule !== 'NONE') whose base date is on or before
   * dateTo are always included so the client can expand occurrences into the
   * visible window even when the base date is older than dateFrom.
   */
  async findMine(userId: string, filters: CalendarEventFilters = {}): Promise<CalendarEvent[]> {
    const qb = this.calendarEventsRepository
      .createQueryBuilder('event')
      .where('event.userId = :userId', { userId });

    if (filters.dateFrom && filters.dateTo) {
      qb.andWhere(
        `((event.date BETWEEN :dateFrom AND :dateTo) OR (event.repeatRule != 'NONE' AND event.date <= :dateTo))`,
        { dateFrom: filters.dateFrom, dateTo: filters.dateTo },
      );
    } else if (filters.dateFrom) {
      qb.andWhere(`(event.date >= :dateFrom OR event.repeatRule != 'NONE')`, {
        dateFrom: filters.dateFrom,
      });
    } else if (filters.dateTo) {
      qb.andWhere('event.date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.category) {
      qb.andWhere('event.category = :category', { category: filters.category });
    }
    if (filters.status) {
      qb.andWhere('event.status = :status', { status: filters.status });
    }

    return qb
      .orderBy('event.date', 'ASC')
      .addOrderBy('event.startTime', 'ASC', 'NULLS LAST')
      .getMany();
  }

  async findOne(userId: string, id: string): Promise<CalendarEvent> {
    return this.findOwned(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateCalendarEventDto): Promise<CalendarEvent> {
    const event = await this.findOwned(userId, id);
    Object.assign(event, dto);
    return this.calendarEventsRepository.save(event);
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    const event = await this.findOwned(userId, id);
    await this.calendarEventsRepository.remove(event);
    return { deleted: true };
  }

  private async findOwned(userId: string, id: string): Promise<CalendarEvent> {
    const event = await this.calendarEventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }
    if (event.userId !== userId) {
      throw new ForbiddenException('This calendar event belongs to another user');
    }
    return event;
  }
}
