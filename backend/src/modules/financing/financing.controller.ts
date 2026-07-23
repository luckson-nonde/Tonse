import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { FinancingService } from './financing.service';

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    parentProviderId?: string | null;
    permissions?: string[];
  };
}

/**
 * Financed checkout — the "Pay via lending institution" surface.
 *
 * Two audiences on one controller:
 *   • BUYER (JwtAuthGuard only): open a financing request for a quote they own,
 *     or cancel one that hasn't funded yet. Ownership is enforced in the service.
 *   • LENDER (JwtAuthGuard + PermissionsGuard/MANAGE_LOANS + explicit
 *     SERVICE_PROVIDER role): confirm the off-platform disbursement, which funds
 *     the product order. The role check is required because PermissionsGuard lets
 *     any account WITHOUT a parentProviderId (which includes buyers) bypass the
 *     permission — same guard shape as LoanController.
 */
@Controller('financing')
export class FinancingController {
  constructor(private readonly financing: FinancingService) {}

  /** Buyer: request lender financing for a product quote they own. */
  @Post('requests')
  @UseGuards(JwtAuthGuard)
  createRequest(
    @Body()
    body: {
      productQuoteId: string;
      tenureMonths?: string | number;
      attributes?: Record<string, any>;
      targetedLenderId?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.financing.createRequest(req.user!.id, body);
  }

  /** Buyer: cancel an in-flight financing request → back to normal payment. */
  @Post('requests/:productQuoteId/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('productQuoteId') productQuoteId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.financing.cancelFinancing(req.user!.id, productQuoteId);
  }

  /** Lender: confirm disbursement → fund the product order's escrow. */
  @Post('offers/:loanQuoteId/confirm-disbursement')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MANAGE_LOANS)
  confirmDisbursement(
    @Param('loanQuoteId') loanQuoteId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user?.role !== 'SERVICE_PROVIDER') {
      throw new ForbiddenException('Only lending providers can confirm a disbursement');
    }
    const lenderId = req.user.parentProviderId ?? req.user.id;
    return this.financing.settleFinancedOrder(lenderId, loanQuoteId);
  }
}
