import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

/**
 * User-facing surface only: any authenticated user can FILE a report and
 * list THEIR OWN filed reports. Listing everything and resolving live under
 * /admin/reports* on AdminController, gated by the ADMIN_REPORTS permission.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(req.user.id, dto);
  }

  @Get('mine')
  async findMine(@Request() req: any, @Query() query: Record<string, any>) {
    // reporterId is pinned AFTER the spread — the caller can never list
    // someone else's reports by passing their own reporterId filter.
    return this.reportsService.findAll({ ...query, reporterId: req.user.id });
  }
}
