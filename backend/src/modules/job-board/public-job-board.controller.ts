import { Controller, Get, Param } from '@nestjs/common';
import { JobBoardService } from './job-board.service';

/**
 * The `/discover` landing page's read-only window into the job board — no
 * guard, deliberately a SIBLING controller to `JobPostingsController` rather
 * than a route carved out of it: that controller's `@UseGuards(JwtAuthGuard)`
 * is class-level, so opting a route out would mean converting all 9 existing
 * routes to per-method guards for no behavioral gain. This module already
 * registers two controllers side by side (job-board.module.ts); a third,
 * unguarded one is a purely additive extension of that same pattern.
 *
 * Static path segments only ('public', 'public/:id') — no collision risk
 * with JobPostingsController's own ':id' route, which lives under a
 * different controller entirely.
 *
 * Both methods return an explicit field allowlist (see
 * `JobBoardService.toPublicPosting`) — never applicant identity, never
 * contact details, never a posting that isn't APPROVED.
 */
@Controller('job-postings/public')
export class PublicJobPostingsController {
  constructor(private readonly jobBoard: JobBoardService) {}

  @Get()
  async list() {
    return this.jobBoard.listPublicJobs();
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.jobBoard.getPublicJobPosting(id);
  }
}
