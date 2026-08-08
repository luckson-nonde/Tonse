import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { UpdateTicketEventDto } from './dto/update-ticket-event.dto';
import { TicketsService } from './tickets.service';

/** Seller-facing ticket management — every route is the caller's own data. */
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post('create')
  async create(@Body() dto: CreateTicketEventDto, @Request() req) {
    return this.tickets.createEvent(req.user.id, dto);
  }

  /** Declared before `:id` so it isn't swallowed by the param route. */
  @Get('my-events')
  async myEvents(@Request() req) {
    return this.tickets.listMyEvents(req.user.id);
  }

  @Get(':id')
  async one(@Param('id') id: string, @Request() req) {
    return this.tickets.getEventForSeller(req.user.id, id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketEventDto, @Request() req) {
    return this.tickets.updateEvent(req.user.id, id, dto);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.tickets.cancelEvent(req.user.id, id);
  }

  @Get(':id/sales')
  async sales(@Param('id') id: string, @Request() req) {
    return this.tickets.salesForEvent(req.user.id, id);
  }
}
