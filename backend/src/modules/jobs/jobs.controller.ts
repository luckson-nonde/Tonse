import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobsService, JobsCaller } from './jobs.service';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { AddJobMediaDto } from './dto/add-job-media.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: JobsCaller;
}

/**
 * Technician jobs surface.
 *
 * Deliberately JwtAuthGuard ONLY — no PermissionsGuard. Its owner-bypass
 * would wave through any account without a parentProviderId (buyers, admins),
 * and the media routes have four legitimate caller types no decorator can
 * express. All authorization is explicit in JobsService.
 */
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Request() req: AuthenticatedRequest, @Query('scope') scope?: string) {
    return this.jobs.list(req.user, scope === 'history' ? 'history' : 'active');
  }

  @Post(':quoteId/assign')
  assign(
    @Param('quoteId') quoteId: string,
    @Body() dto: AssignTechnicianDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.jobs.assign(req.user, quoteId, dto.technicianId ?? null);
  }

  @Post(':quoteId/media')
  addMedia(
    @Param('quoteId') quoteId: string,
    @Body() dto: AddJobMediaDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.jobs.addMedia(req.user, quoteId, dto);
  }

  @Get(':quoteId/media')
  listMedia(@Param('quoteId') quoteId: string, @Request() req: AuthenticatedRequest) {
    return this.jobs.listMedia(req.user, quoteId);
  }
}
