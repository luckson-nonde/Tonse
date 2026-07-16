import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Payments — READ-ONLY surface.
 *
 * FINANCIAL INTEGRITY: this table is the money record, so it is written ONLY
 * by the server, from the flows that actually move money (escrow release, and
 * — once the PSP lands — webhook-confirmed collections). There is deliberately
 * NO create/update/delete endpoint: a ledger its own subjects can mint, flip
 * to SUCCESS, or delete is not a ledger. Corrections are made by posting a
 * reversing record, never by editing history.
 *
 * Every read is scoped to the caller; only an ADMIN sees another party's rows
 * (the platform-wide view lives on /admin/transactions).
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private isAdmin(req: any): boolean {
    return req.user?.role === 'ADMIN';
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any, @Request() req) {
    // Forced — ignore any client-supplied userId.
    const filters = {
      ...query,
      userId: req.user.id,
    };
    return this.paymentsService.findAll(filters);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string, @Request() req) {
    if (req.user.id !== userId && !this.isAdmin(req)) {
      throw new ForbiddenException('You can only view your own payments');
    }
    return this.paymentsService.findByUser(userId);
  }

  @Get('type/:type')
  @UseGuards(JwtAuthGuard)
  async findByType(@Param('type') type: string, @Request() req) {
    // Scoped to the caller unless ADMIN — previously this returned every
    // user's payments of a given type to any authenticated caller.
    return this.paymentsService.findByType(type, this.isAdmin(req) ? undefined : req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    const payment = await this.paymentsService.findOne(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.userId !== req.user.id && !this.isAdmin(req)) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    return payment;
  }
}
