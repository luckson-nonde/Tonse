import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { CalendarEventsService } from '../calendar-events.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Generic personal scheduling — any authenticated role (buyer or provider)
 * manages its own calendar entries. No @Roles() on purpose; ownership is
 * enforced in the service against req.user.id. Guards are NOT global in
 * this repo, so the class-level JwtAuthGuard is what keeps this closed.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateCalendarEventDto) {
    return this.calendarEventsService.create(req.user.id, dto);
  }

  @Get()
  async list(
    @Request() req: AuthenticatedRequest,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.calendarEventsService.findMine(req.user.id, {
      dateFrom,
      dateTo,
      category,
      status,
    });
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.calendarEventsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarEventsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.calendarEventsService.remove(req.user.id, id);
  }
}
