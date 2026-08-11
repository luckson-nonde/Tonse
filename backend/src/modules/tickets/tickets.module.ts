import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerService } from '../../common/mail/mailer.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentsModule } from '../payments/payments.module';
import { EventTicketSettings } from './entities/event-ticket-settings.entity';
import { TicketEventScanner } from './entities/ticket-event-scanner.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketOrder } from './entities/ticket-order.entity';
import { TicketTier } from './entities/ticket-tier.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketPosterSweepService } from './ticket-poster-sweep.service';
import { TicketsPublicController } from './tickets-public.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

/**
 * Event ticketing — sellers in the events category create events with priced
 * tiers and sell to guests through a public share link; proceeds land in the
 * seller's venture balance net of the admin-set commission.
 *
 * Guest payments run through the REAL PSP now: TicketsPublicController calls
 * CheckoutService's guest-capable ticket methods (initiate/status/verify, no
 * JWT — ownership is the reference + context.kind), and a verified payment
 * calls back into TicketsService.commitPaidTicketOrder for the atomic mint.
 * That call-back is why the PaymentsModule import is a forwardRef cycle.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketEvent,
      TicketTier,
      TicketOrder,
      Ticket,
      EventTicketSettings,
      TicketEventScanner,
    ]),
    LedgerModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService, MailerService, TicketPosterSweepService],
  exports: [TicketsService],
})
export class TicketsModule {}
