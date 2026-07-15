import {
  Body,
  Controller,
  ForbiddenException,
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
import {
  MakeLoanOfferDto,
  DeclineLoanDto,
  ReviseLoanOfferDto,
  AdvanceLoanStageDto,
} from './dto';

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
    // SECURITY: PermissionsGuard treats any account WITHOUT a parentProviderId
    // as an "owner" and bypasses MANAGE_LOANS — which includes BUYERS. Lenders
    // onboard as SERVICE_PROVIDER, so gate the whole surface on that role here
    // (staff loan officers inherit their parent's SERVICE_PROVIDER role). This
    // stops a borrower (or a non-lending seller/admin) from operating the
    // lender console / spoofing loan offers.
    if (req.user?.role !== 'SERVICE_PROVIDER') {
      throw new ForbiddenException('Only lending providers can access loan offers');
    }
    return req.user.parentProviderId ?? req.user.id;
  }

  @Get('offers')
  offers(@Request() req: AuthenticatedRequest) {
    return this.loans.listOffers(this.lenderId(req));
  }

  @Post('offer')
  makeOffer(@Body() body: MakeLoanOfferDto, @Request() req: AuthenticatedRequest) {
    return this.loans.createOffer(this.lenderId(req), body);
  }

  @Post('decline')
  decline(@Body() body: DeclineLoanDto, @Request() req: AuthenticatedRequest) {
    return this.loans.decline(this.lenderId(req), body);
  }

  @Patch('offers/:id')
  revise(
    @Param('id') id: string,
    @Body() body: ReviseLoanOfferDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.loans.reviseOffer(this.lenderId(req), id, body);
  }

  /** Advance an accepted loan's lifecycle (CONTACTED/VERIFIED/DISBURSED/COMPLETED). */
  @Patch('offers/:id/stage')
  advanceStage(
    @Param('id') id: string,
    @Body() body: AdvanceLoanStageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.loans.advanceStage(this.lenderId(req), id, body.stage);
  }
}
