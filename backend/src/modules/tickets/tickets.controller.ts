import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddScannerDto } from './dto/add-scanner.dto';
import { CreateTicketEventDto } from './dto/create-ticket-event.dto';
import { ScanTicketDto } from './dto/scan-ticket.dto';
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

  // ── Door check-in (literal `scan/…` segments — also before `:id`) ──────

  /** Events the caller can work the door for: their own + ones where they
   *  were assigned as a scanner by email. */
  @Get('scan/events')
  async scanEvents(@Request() req) {
    return this.tickets.listScanEvents(req.user);
  }

  /** Scan (or hand-type) a TIX code — flips VALID → REDEEMED and answers
   *  with an ADMIT/reject verdict for the door screen. */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scan(@Body() dto: ScanTicketDto, @Request() req) {
    return this.tickets.scanTicket(req.user, dto);
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

  /** Permanent removal — refused if the event ever sold a ticket. */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.tickets.deleteEvent(req.user.id, id);
  }

  /** Bulk-refund every buyer of a cancelled event, for exactly what they paid. */
  @Post(':id/refund-all')
  @HttpCode(HttpStatus.OK)
  async refundAll(@Param('id') id: string, @Request() req) {
    return this.tickets.refundAllForEvent(req.user.id, id);
  }

  @Get(':id/sales')
  async sales(@Param('id') id: string, @Request() req) {
    return this.tickets.salesForEvent(req.user.id, id);
  }

  // ── Door team management (organizer only) ──────────────────────────────

  @Get(':id/scanners')
  async scanners(@Param('id') id: string, @Request() req) {
    return this.tickets.listScanners(req.user.id, id);
  }

  @Post(':id/scanners')
  async addScanner(@Param('id') id: string, @Body() dto: AddScannerDto, @Request() req) {
    return this.tickets.addScanner(req.user.id, id, dto);
  }

  @Delete(':id/scanners/:scannerId')
  async removeScanner(
    @Param('id') id: string,
    @Param('scannerId') scannerId: string,
    @Request() req,
  ) {
    return this.tickets.removeScanner(req.user.id, id, scannerId);
  }
}
