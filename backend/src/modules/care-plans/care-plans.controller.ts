import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { CarePlansService } from './care-plans.service';
import { CreateCarePlanDto } from './dto/create-care-plan.dto';
import { UpdateCarePlanDto } from './dto/update-care-plan.dto';
import { RenewCarePlanDto } from './dto/renew-care-plan.dto';
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
 * Home Care care plans — the provider-facing "My Clients" surface.
 * Ownership is enforced in the service (providerId = caller's owner id),
 * so every route is safe for staff acting on the owner's behalf.
 */
@Controller('care-plans')
@UseGuards(JwtAuthGuard)
export class CarePlansController {
  constructor(private readonly carePlansService: CarePlansService) {}

  /** The caller's client roster (provider perspective). */
  @Get()
  async list(@Request() req: AuthenticatedRequest) {
    return this.carePlansService.listForProvider(req.user);
  }

  /** The caller's own plans as a client (buyer perspective — future buyer view). */
  @Get('buyer')
  async listAsBuyer(@Request() req: AuthenticatedRequest) {
    return this.carePlansService.listForBuyer(req.user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SELLER', 'SERVICE_PROVIDER')
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateCarePlanDto) {
    return this.carePlansService.createFromQuote(req.user, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SELLER', 'SERVICE_PROVIDER')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarePlanDto,
  ) {
    return this.carePlansService.update(req.user, id, dto);
  }

  @Post(':id/renew')
  @UseGuards(RolesGuard)
  @Roles('SELLER', 'SERVICE_PROVIDER')
  async renew(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewCarePlanDto,
  ) {
    return this.carePlansService.renew(req.user, id, dto);
  }
}
