import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerModule } from '../ledger/ledger.module';
import { EventTicketSettings } from './entities/event-ticket-settings.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketOrder } from './entities/ticket-order.entity';
import { TicketTier } from './entities/ticket-tier.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketsPublicController } from './tickets-public.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

/**
 * Event ticketing — sellers in the events category create events with priced
 * tiers and sell to guests through a public share link; proceeds land in the
 * seller's venture balance net of the admin-set commission.
 *
 * No PaymentsModule import on purpose: the guest payment is simulated inside
 * this module (see tickets-public.controller.ts) rather than routed through
 * the JWT-guarded CheckoutService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TicketEvent, TicketTier, TicketOrder, Ticket, EventTicketSettings]),
    LedgerModule,
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
