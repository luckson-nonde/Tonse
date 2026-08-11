import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CheckoutService } from '../payments/checkout.service';

/** PSP channel details for the subscription checkout (ads checkout shape). */
class SubscriptionCheckoutDto {
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

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    parentProviderId?: string | null;
  };
}

/**
 * Buyer/shop-facing billing surface. Admin edits live under /admin/billing-settings.
 */
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly checkoutService: CheckoutService,
  ) {}

  /** Any authenticated role — buyers need the fee tiers, shops the flag + monthly fee. */
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings() {
    return this.billingService.getSettingsPublic();
  }

  @Get('subscription/me')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@Request() req: AuthenticatedRequest) {
    return this.billingService.getMySubscriptionStatus(req.user);
  }

  /**
   * Start a REAL subscription payment — replaces the old simulated
   * subscription/pay (which extended paidUntil on a bare click). The amount
   * is the current admin-set monthlyFee, read server-side; the 30-day
   * extension happens only after the PSP verifies the money. Staff may renew
   * on the owner's behalf — the subscription row is owner-keyed either way.
   */
  @Post('subscription/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'SERVICE_PROVIDER')
  async checkoutSubscription(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubscriptionCheckoutDto,
  ) {
    const ownerId = req.user.parentProviderId ?? req.user.id;
    return this.checkoutService.initiateSubscriptionFee(ownerId, dto);
  }
}
