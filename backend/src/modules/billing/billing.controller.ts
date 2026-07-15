import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { BillingService } from './billing.service';
import { PaySubscriptionDto } from './dto/pay-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
  constructor(private readonly billingService: BillingService) {}

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

  /** Staff may renew on the owner's behalf — the row is owner-keyed either way. */
  @Post('subscription/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'SERVICE_PROVIDER')
  async paySubscription(@Request() req: AuthenticatedRequest, @Body() dto: PaySubscriptionDto) {
    return this.billingService.paySubscription(req.user, dto);
  }
}
