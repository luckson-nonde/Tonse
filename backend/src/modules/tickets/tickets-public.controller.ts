import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CheckoutTicketsDto } from './dto/checkout-tickets.dto';
import { TicketsService } from './tickets.service';

/**
 * Guest-facing side of ticketing — deliberately NO auth guard. Anyone with a
 * share link (`/e/EVT-XXXXXX`) can view the event and buy tickets without an
 * account; the payment is simulated (this app's convention) but the ledger
 * credit to the seller is real.
 *
 * Route ordering: `checkout/:reference/simulate` starts with the literal
 * segment `checkout`, so it can't be swallowed by `GET :code`.
 */
@Controller('tickets/public')
export class TicketsPublicController {
  constructor(private readonly tickets: TicketsService) {}

  /** Complete a pending purchase — stands in for the PSP webhook. Idempotent:
   *  replays return the already-minted tickets. */
  @Post('checkout/:reference/simulate')
  @HttpCode(HttpStatus.OK)
  async simulate(@Param('reference') reference: string) {
    return this.tickets.simulatePublicPayment(reference);
  }

  @Get(':code')
  async event(@Param('code') code: string) {
    return this.tickets.getPublicEvent(code);
  }

  /** Price the selection server-side and park a PENDING order. */
  @Post(':code/checkout')
  async checkout(@Param('code') code: string, @Body() dto: CheckoutTicketsDto) {
    return this.tickets.initiatePublicCheckout(code, dto);
  }
}
