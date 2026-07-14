import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { CollectionService } from './collection.service';

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
 * Collection / handover surface. Guarded by MANAGE_COLLECTIONS: owners pass via
 * the guard's owner-bypass, Collection Officers pass via their permission.
 * Everything is scoped to the shop (`parentProviderId ?? id`), so a staff
 * officer acts on the owner's parcels here and NOWHERE else — the generic
 * /quotes and /orders endpoints still gate strictly on `req.user.id`.
 */
@Controller('collection')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.MANAGE_COLLECTIONS)
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  /** The shop whose parcels this caller acts on (owner, or a staff's owner). */
  private shopId(req: AuthenticatedRequest): string {
    return req.user.parentProviderId ?? req.user.id;
  }

  @Get('queue')
  queue(@Request() req: AuthenticatedRequest) {
    return this.collection.queue(this.shopId(req));
  }

  @Get('recent')
  recent(@Request() req: AuthenticatedRequest) {
    return this.collection.recent(this.shopId(req));
  }

  @Get('lookup')
  lookup(@Query('code') code: string, @Request() req: AuthenticatedRequest) {
    return this.collection.lookupByCode(this.shopId(req), code);
  }

  @Patch(':quoteId/verify')
  verify(@Param('quoteId') quoteId: string, @Request() req: AuthenticatedRequest) {
    return this.collection.verify(this.shopId(req), quoteId);
  }

  @Patch(':quoteId/complete')
  complete(@Param('quoteId') quoteId: string, @Request() req: AuthenticatedRequest) {
    return this.collection.complete(this.shopId(req), quoteId);
  }
}
