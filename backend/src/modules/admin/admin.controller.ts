import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateMilestoneDto } from '../referrals/dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../referrals/dto/update-milestone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ───── Platform overview ────────────────────────────────────────────────

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // ───── User management ──────────────────────────────────────────────────

  @Get('users')
  async listUsers(@Query() query: Record<string, any>) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id/suspend')
  async suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Patch('users/:id/unsuspend')
  async unsuspendUser(@Param('id') id: string) {
    return this.adminService.unsuspendUser(id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  // ───── Verification queue ───────────────────────────────────────────────

  @Get('verifications')
  async listVerifications(@Query() query: Record<string, any>) {
    return this.adminService.listVerifications(query);
  }

  @Patch('users/:id/verify')
  async verifyUser(@Param('id') id: string) {
    return this.adminService.verifyUser(id);
  }

  @Patch('users/:id/reject')
  async rejectUser(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.adminService.rejectUser(id, body?.reason);
  }

  // ───── Category control ─────────────────────────────────────────────────

  @Get('categories')
  async listCategories() {
    return this.adminService.listCategories();
  }

  @Patch('categories/:id')
  async setCategoryActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean }
  ) {
    return this.adminService.setCategoryActive(id, !!body?.isActive);
  }

  // ───── Promoter programme (milestones + oversight) ──────────────────────

  @Get('milestones')
  async listMilestones() {
    return this.adminService.listMilestones();
  }

  @Post('milestones')
  async createMilestone(@Body() dto: CreateMilestoneDto) {
    return this.adminService.createMilestone(dto);
  }

  @Patch('milestones/:id')
  async updateMilestone(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.adminService.updateMilestone(id, dto);
  }

  /** 409s (via MilestonesService) if the milestone has already paid out. */
  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMilestone(@Param('id') id: string) {
    await this.adminService.removeMilestone(id);
  }

  @Get('promoters')
  async listPromoters() {
    return this.adminService.listPromoters();
  }

  /** Full detail for identity review — selfie, ID document, socials. */
  @Get('promoters/:id')
  async getPromoterDetail(@Param('id') id: string) {
    return this.adminService.getPromoterDetail(id);
  }

  /** Approve/reject the promoter's identity proof. */
  @Patch('promoters/:id/verification')
  async setPromoterVerification(
    @Param('id') id: string,
    @Body() body: { status: 'VERIFIED' | 'REJECTED'; reason?: string },
  ) {
    return this.adminService.setPromoterVerification(id, body?.status, body?.reason);
  }

  /** Current invite key + unlisted signup URL (what the admin shares). */
  @Get('promoter-invite')
  async getPromoterInvite() {
    return this.adminService.getPromoterInvite();
  }

  /** Mint a fresh invite key — the old one stops working immediately. */
  @Post('promoter-invite/rotate')
  async rotatePromoterInvite() {
    return this.adminService.rotatePromoterInvite();
  }

  // ───── Cross-cutting lists ──────────────────────────────────────────────

  @Get('inquiries')
  async listInquiries(@Query() query: Record<string, any>) {
    return this.adminService.listInquiries(query);
  }

  @Get('quotes')
  async listQuotes(@Query() query: Record<string, any>) {
    return this.adminService.listQuotes(query);
  }

  @Get('transactions')
  async listTransactions(@Query() query: Record<string, any>) {
    return this.adminService.listTransactions(query);
  }

  @Get('audit')
  async listAudit(@Query() query: Record<string, any>) {
    return this.adminService.listAudit(query);
  }

  // ───── Destructive maintenance ──────────────────────────────────────────

  @Post('clear-all-data')
  @HttpCode(HttpStatus.OK)
  async clearAllData() {
    await this.adminService.clearAllData();
    return {
      message: 'All transactional data has been cleared successfully.',
      timestamp: new Date().toISOString(),
    };
  }
}
