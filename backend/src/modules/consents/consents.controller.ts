import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsentsService } from './consents.service';

/**
 * Consent capture — self-scoped. A user records/withdraws their own consents
 * (NRC, GPS, per-transaction sharing, off-platform hand-off, marketing) and
 * reads their current state. The actor is always taken from the JWT, never the
 * body, so no one can record consent on another user's behalf.
 */
@Controller('consents')
@UseGuards(JwtAuthGuard)
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Get()
  async current(@Request() req: any) {
    return this.consents.current(req.user.id);
  }

  @Post()
  async record(
    @Request() req: any,
    @Body() body: { noticeKey: string; granted?: boolean; version?: string; method?: string },
  ) {
    return this.consents.record(
      req.user.id,
      String(body?.noticeKey || ''),
      body?.granted !== false,
      body?.version || '1',
      body?.method,
    );
  }
}
