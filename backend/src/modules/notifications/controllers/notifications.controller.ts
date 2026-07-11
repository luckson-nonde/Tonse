import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Request,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { Observable, interval, map, merge } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SkipTransform } from '../../../common/decorators/skip-transform.decorator';
import { NotificationsService, StreamMessage } from '../notifications.service';
import { UpdateNotificationStatusDto } from '../dto/update-notification-status.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user?: { id: string; email: string; role: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * The live dispatch stream. Auth: EventSource can't set headers, so the
   * JWT arrives as ?token= (JwtStrategy has a query-param fallback).
   *
   * @SkipTransform — the global TransformInterceptor envelope would wrap
   * each StreamMessage and destroy its SSE type/id framing.
   *
   * Heartbeat every 20s keeps idle connections alive through proxies
   * (Vite dev proxy, Cloudflare tunnel). If this ever sits behind Nginx,
   * also set X-Accel-Buffering: no.
   */
  @Sse('stream')
  @SkipTransform()
  stream(@Request() req: AuthenticatedRequest): Observable<StreamMessage> {
    const userId = req.user!.id;
    const { id, observable } = this.notificationsService.registerConnection(userId);
    req.on('close', () => this.notificationsService.unregisterConnection(userId, id));
    return merge(
      observable,
      interval(20000).pipe(map(() => ({ type: 'heartbeat', data: '{}' }) as StreamMessage)),
    );
  }

  /** Tier-1 events created after `since` — reconnect backfill. */
  @Get('catch-up')
  catchUp(@Query('since') since: string, @Request() req: AuthenticatedRequest) {
    const parsed = since ? new Date(since) : new Date(Date.now() - 24 * 3600 * 1000);
    return this.notificationsService.getCatchUp(
      req.user!.id,
      isNaN(parsed.getTime()) ? new Date(Date.now() - 24 * 3600 * 1000) : parsed,
    );
  }

  @Get('unread-count')
  unreadCount(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(req.user!.id);
  }

  @Get()
  findMine(@Query('limit') limit: string, @Request() req: AuthenticatedRequest) {
    return this.notificationsService.findMine(req.user!.id, Number(limit) || 50);
  }

  @Patch('mark-all-read')
  markAllRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(req.user!.id);
  }

  /** Provider Accept (ACKNOWLEDGED) / Decline (DECLINED) on a NEW_LEAD.
   *  Ownership-checked in the service; ACK pushes the buyer's live
   *  "providers accepted" tick. */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.updateStatus(id, req.user!.id, dto.status);
  }
}
