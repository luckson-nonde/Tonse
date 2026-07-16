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

  /** Poll payment progress (the payer approves out-of-band on their handset). */
  @Get('checkout/:reference')
  @UseGuards(JwtAuthGuard)
  async status(@Param('reference') reference: string, @Request() req) {
    return this.checkout.status(req.user.id, reference);
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
 * PSP webhooks. Public by necessity — the provider has no JWT. Authentication
 * is the SIGNATURE over the raw body, verified inside `parseWebhook`; an
 * unsigned or mis-signed event is rejected before it can touch money.
 */
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly checkout: CheckoutService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  @Post('psp')
  @HttpCode(HttpStatus.OK)
  async receive(@Req() req: ExpressRequest & { rawBody?: Buffer }) {
    const raw = req.rawBody;
    if (!raw?.length) {
      // Without the raw bytes the signature can't be checked, and a webhook we
      // can't authenticate is one we must not act on.
      throw new BadRequestException('Missing raw body — cannot verify signature');
    }
    const event = this.provider.parseWebhook(raw, req.headers as Record<string, any>);
    return this.checkout.handleWebhook(event);
  }
}
