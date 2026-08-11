import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JobBoardService } from './job-board.service';
import { ApplyToJobDto, CreateJobPostingDto, UpdateJobPostingDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Poster + seeker surface of the job board. No role gate anywhere here —
 * ANY authenticated user may post (ads precedent). The feed is the whole
 * board (every approved, open posting); applying self-gates on holding an
 * employment account. Admin approve/reject lives in AdminController.
 *
 * Static routes ('mine', 'feed') are declared before ':id' so they aren't
 * swallowed by the param route (repo convention).
 */
@Controller('job-postings')
@UseGuards(JwtAuthGuard)
export class JobPostingsController {
  constructor(private readonly jobBoard: JobBoardService) {}

  @Post()
  async create(@Body() dto: CreateJobPostingDto, @Request() req) {
    return this.jobBoard.createPosting(req.user.id, dto);
  }

  @Get('mine')
  async mine(@Request() req) {
    return this.jobBoard.listMyPostings(req.user.id);
  }

  @Get('feed')
  async feed(@Request() req) {
    return this.jobBoard.listOpenJobs(req.user.id);
  }

  @Get(':id')
  async one(@Param('id') id: string, @Request() req) {
    return this.jobBoard.getPostingWithApplicants(id, req.user.id);
  }

  @Patch(':id')
  async resubmit(@Param('id') id: string, @Body() dto: UpdateJobPostingDto, @Request() req) {
    return this.jobBoard.resubmitPosting(id, req.user.id, dto);
  }

  @Post(':id/close')
  async close(@Param('id') id: string, @Request() req) {
    return this.jobBoard.closePosting(id, req.user.id);
  }

  @Post(':id/fill')
  async fill(@Param('id') id: string, @Request() req) {
    return this.jobBoard.markFilled(id, req.user.id);
  }

  @Post(':id/apply')
  async apply(@Param('id') id: string, @Body() dto: ApplyToJobDto, @Request() req) {
    return this.jobBoard.applyToJob(id, req.user.id, dto);
  }
}

@Controller('job-applications')
@UseGuards(JwtAuthGuard)
export class JobApplicationsController {
  constructor(private readonly jobBoard: JobBoardService) {}

  @Get('mine')
  async mine(@Request() req) {
    return this.jobBoard.listMyApplications(req.user.id);
  }

  @Post(':id/accept')
  async accept(@Param('id') id: string, @Request() req) {
    return this.jobBoard.acceptApplication(id, req.user.id);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Request() req) {
    return this.jobBoard.rejectApplication(id, req.user.id);
  }
}
