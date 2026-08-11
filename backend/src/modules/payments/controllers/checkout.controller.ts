import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Request,
  UseGuards,
  BadRequestException,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import type { Request as ExpressRequest } from 'express';
import { CheckoutService } from '../checkout.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PAYMENT_PROVIDER, PaymentProvider } from '../providers/payment-provider.interface';
import { SandboxPaymentProvider } from '../providers/sandbox.provider';

export class CheckoutDto {
  @IsUUID()
  quoteId: string;

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

@Controller('payments')
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Start paying for a quote. The amount is read from the quote server-side —
   * the client cannot name its own price.
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async startCheckout(@Body() dto: CheckoutDto, @Request() req) {
    return this.checkout.checkout(req.user.id, dto);
  }

  /** Poll payment progress (the payer approves out-of-band on their handset,
   *  or on the provider's hosted page). */
  @Get('checkout/:reference')
  @UseGuards(JwtAuthGuard)
  async status(@Param('reference') reference: string, @Request() req) {
    return this.checkout.status(req.user.id, reference);
  }

  /**
   * The payer is back from a hosted payment page — check with the provider and
   * settle if it really was paid.
   *
   * This exists because a hosted-page provider's server-to-server notification
   * is best-effort and unordered against the payer's return. Calling it proves
   * nothing on its own: it re-asks the provider, exactly as the notification
   * path does, and is idempotent against it.
   */
  @Post('checkout/:reference/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyReturn(@Param('reference') reference: string, @Request() req) {
    return this.checkout.settleFromReturn(req.user.id, reference);
  }

  /**
   * SANDBOX ONLY — stand in for the payer approving on their phone. Emits a
   * properly signed webhook through the real handler, so the sandbox exercises
   * the exact production path (verify → journal) rather than a shortcut.
   * Refuses outright when a live provider is configured.
   */
  @Post('checkout/:reference/simulate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async simulate(
    @Param('reference') reference: string,
    @Body() body: { outcome?: 'successful' | 'failed' },
  ) {
    if (!(this.provider instanceof SandboxPaymentProvider)) {
      throw new BadRequestException('Simulation is only available with the sandbox provider');
    }
    const outcome = body?.outcome === 'failed' ? 'failed' : 'successful';
    await this.provider.simulateConfirm(reference, outcome);
    return this.checkout.handleWebhook({
      eventId: `sbx-${reference}-${outcome}`,
      type: 'collection',
      reference,
      status: outcome,
      raw: { sandbox: true, reference, status: outcome },
    });
  }
}

/**
 * PSP callbacks. Public by necessity — the provider has no JWT.
 *
 * Where the provider signs its callbacks, the signature over the raw body is
 * the authentication and `parseWebhook` rejects anything that doesn't match.
 * DPO signs nothing, so there the shared secret on the notification URL is all
 * this endpoint can check — and it is deliberately NOT what makes the flow
 * safe. Safety comes from the handler re-verifying every event with the
 * provider before a single ngwee moves.
 */
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly checkout: CheckoutService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  @Post('psp')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/xml')
  async receive(@Req() req: ExpressRequest & { rawBody?: Buffer }) {
    const raw = req.rawBody;
    if (!raw?.length) {
      // Without the raw bytes a signature can't be checked, and for an unsigned
      // provider there is nothing to parse — either way, nothing to act on.
      throw new BadRequestException('Missing raw body — cannot process callback');
    }
    const event = this.provider.parseWebhook(
      raw,
      req.headers as Record<string, any>,
      req.query as Record<string, any>,
    );
    await this.checkout.handleWebhook(event);

    // DPO expects this exact acknowledgement document and re-pushes without it.
    // We ack whatever the outcome was: the notification WAS received, and
    // whether it settled is our business, not a delivery failure to retry.
    return '<?xml version="1.0" encoding="utf-8"?>\n<API3G><Response>OK</Response></API3G>';
  }
}
