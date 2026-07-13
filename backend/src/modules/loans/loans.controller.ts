import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { LoanService } from './loans.service';

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
 * Lender-side loan surface. Guarded by MANAGE_LOANS (owners bypass, loan
 * officers pass); everything scoped to the lender (`parentProviderId ?? id`).
 * Loan REQUESTS are read via the existing GET /inquiries/leads/me (a lender
 * only subscribes to `loans`, so all their leads are loan requests). Loan
 * OFFERS are made/read here so a Loan Officer never touches /quotes.
 */
@Controller('loans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.MANAGE_LOANS)
export class LoanController {
  constructor(private readonly loans: LoanService) {}

  private lenderId(req: AuthenticatedRequest): string {
    return req.user.parentProviderId ?? req.user.id;
  }

  @Get('offers')
  offers(@Request() req: AuthenticatedRequest) {
    return this.loans.listOffers(this.lenderId(req));
  }

  @Post('offer')
  makeOffer(@Body() body: any, @Request() req: AuthenticatedRequest) {
    return this.loans.createOffer(this.lenderId(req), body);
  }

  @Post('decline')
  decline(@Body() body: any, @Request() req: AuthenticatedRequest) {
    return this.loans.decline(this.lenderId(req), body);
  }

  @Patch('offers/:id')
  revise(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.loans.reviseOffer(this.lenderId(req), id, body);
  }
}
