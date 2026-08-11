import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { Request, Response } from 'express';
import { CheckoutTicketsDto } from './dto/checkout-tickets.dto';
import { TicketsService } from './tickets.service';
import { CheckoutService } from '../payments/checkout.service';

/** PSP channel details for a guest ticket payment (ads checkout shape). */
class TicketPayDto {
  @IsOptional()
  @IsIn(['mobile-money', 'card'])
  channel?: 'mobile-money' | 'card';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  operator?: string;
}

/**
 * Guest-facing side of ticketing — deliberately NO auth guard. Anyone with a
 * share link (`/e/EVT-XXXXXX`) can view the event and buy tickets without an
 * account. Payment runs through the REAL PSP via CheckoutService's guest
 * ticket methods (ownership = reference + context.kind, never a userId);
 * the sandbox provider keeps an explicit simulate endpoint for dev.
 *
 * Route ordering: `checkout/...` starts with a literal segment, so these
 * can't be swallowed by `GET :code`.
 */
@Controller('tickets/public')
export class TicketsPublicController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly checkoutService: CheckoutService,
  ) {}

  /** Start the PSP collection for a PENDING order: mobile money is an in-app
   *  push, card returns the hosted-page redirect. */
  @Post('checkout/:reference/pay')
  @HttpCode(HttpStatus.OK)
  async pay(@Param('reference') reference: string, @Body() dto: TicketPayDto) {
    return this.checkoutService.initiateTicketPurchase(reference, dto);
  }

  /** Poll the payment's stored status (no provider round-trip). */
  @Get('checkout/payment/:reference')
  async paymentStatus(@Param('reference') reference: string) {
    return this.checkoutService.ticketPaymentStatus(reference);
  }

  /** Re-verify with the provider and settle if paid — the guest's return trip
   *  and the approve-on-phone poll both land here. Idempotent. */
  @Post('checkout/payment/:reference/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Param('reference') reference: string) {
    return this.checkoutService.settleTicketFromReturn(reference);
  }

  /** The paid order + minted ticket codes, once payment has settled. */
  @Get('checkout/:reference/order')
  async paidOrder(@Param('reference') reference: string) {
    return this.tickets.getPaidPublicOrder(reference);
  }

  /** SANDBOX ONLY — stands in for the payer approving on their phone.
   *  Refused outright on a live provider: with real money in play, a free
   *  "mark this paid" endpoint would be a mint-tickets-for-nothing hole. */
  @Post('checkout/:reference/simulate')
  @HttpCode(HttpStatus.OK)
  async simulate(@Param('reference') reference: string) {
    if (!this.checkoutService.isSandbox()) {
      throw new BadRequestException('Simulation is only available with the sandbox provider');
    }
    return this.tickets.commitPaidTicketOrder(reference);
  }

  /** The link sellers actually SHARE — real HTML with Open Graph tags so
   *  WhatsApp/Facebook show a decorated preview (poster, title, date, venue);
   *  humans are instantly redirected to the SPA ticket page. Raw @Res on
   *  purpose: this returns HTML, not the JSON envelope. */
  @Get(':code/share')
  async share(@Param('code') code: string, @Req() req: Request, @Res() res: Response) {
    // The API's own public origin, for resolving relative poster URLs in the
    // OG tags — honour the proxy header (Render terminates TLS upstream).
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol;
    const apiOrigin = `${proto}://${req.get('host')}`;
    res.type('html').send(await this.tickets.getShareHtml(code, apiOrigin));
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
