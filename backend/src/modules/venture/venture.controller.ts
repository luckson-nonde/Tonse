import { Body, Controller, ForbiddenException, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LedgerService } from '../ledger/ledger.service';
import { CheckoutService } from '../payments/checkout.service';
import { VentureDepositDto } from './dto/venture-deposit.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user?: { id: string; email: string; role: string };
}

/**
 * Seller-facing surface over the ledger's SELLER_PAYABLE account — the
 * "venture account". Always scoped to `req.user.id`, never a param, so a
 * seller can only ever read or fund their own balance.
 *
 * Deliberately `req.user.id` only, not `parentProviderId ?? id` — a staff
 * member doesn't get to read or deposit into the shop owner's venture
 * balance through this endpoint unless a future permission explicitly
 * grants it.
 */
@Controller('venture-account')
@UseGuards(JwtAuthGuard)
export class VentureController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly checkout: CheckoutService,
  ) {}

  private sellerId(req: AuthenticatedRequest): string {
    if (req.user?.role !== 'SELLER' && req.user?.role !== 'SERVICE_PROVIDER') {
      throw new ForbiddenException('Only shops have a venture account');
    }
    return req.user.id;
  }

  @Get('balance')
  async balance(@Request() req: AuthenticatedRequest) {
    return { balance: await this.ledger.sellerBalance(this.sellerId(req)) };
  }

  @Get('history')
  async history(
    @Query() query: { page?: string; limit?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ledger.listJournals({ ...query, counterpartyId: this.sellerId(req) });
  }

  /** Start a deposit. The actual money logic lives in CheckoutService,
   *  which already owns PSP-collection + webhook-verified ledger posting. */
  @Post('deposit')
  async deposit(@Body() dto: VentureDepositDto, @Request() req: AuthenticatedRequest) {
    return this.checkout.initiateVentureDeposit(this.sellerId(req), dto);
  }
}
