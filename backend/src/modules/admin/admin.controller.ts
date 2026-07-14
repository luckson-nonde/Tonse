import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminManagerService } from './admin-manager.service';
import { CreateMilestoneDto } from '../referrals/dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../referrals/dto/update-milestone.dto';
import { CreateAdminManagerDto } from './dto/create-admin-manager.dto';
import { UpdateAdminManagerDto } from './dto/update-admin-manager.dto';
import { ResolveReportDto } from '../reports/dto/resolve-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { ADMIN_PERMISSIONS } from '../auth/constants/admin-permissions';

/**
 * Guard stack: JwtAuthGuard → RolesGuard('ADMIN') → AdminPermissionsGuard.
 *
 * AdminPermissionsGuard is DENY-BY-DEFAULT for sub-admins ("User
 * Managers", role ADMIN with parentProviderId set): undecorated routes
 * are primary-admin-only; a route opens to a sub-admin only when
 * decorated with @AdminPermission(...) naming a code they hold.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminManagerService: AdminManagerService,
  ) {}

  /** Acting-admin identity for audit trails — straight off req.user (JWT
   *  strategy loads it from the DB each request; no extra query here). */
  private actor(req: any): { id: string; displayId?: string } {
    return { id: req.user.id, displayId: req.user.displayId };
  }

  // ───── Platform overview ────────────────────────────────────────────────

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // ───── User management ──────────────────────────────────────────────────

  @Get('users')
  @AdminPermission(ADMIN_PERMISSIONS.USERS)
  async listUsers(@Query() query: Record<string, any>) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id/suspend')
  @AdminPermission(ADMIN_PERMISSIONS.USERS)
  async suspendUser(@Request() req: any, @Param('id') id: string) {
    return this.adminService.suspendUser(id, this.actor(req));
  }

  @Patch('users/:id/unsuspend')
  @AdminPermission(ADMIN_PERMISSIONS.USERS)
  async unsuspendUser(@Request() req: any, @Param('id') id: string) {
    return this.adminService.unsuspendUser(id, this.actor(req));
  }

  /** Primary-admin-only by design — User Managers can never delete. */
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('users/:id')
  @AdminPermission(ADMIN_PERMISSIONS.USERS, ADMIN_PERMISSIONS.VERIFICATIONS)
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  // ───── Verification queue ───────────────────────────────────────────────

  @Get('verifications')
  @AdminPermission(ADMIN_PERMISSIONS.VERIFICATIONS)
  async listVerifications(@Query() query: Record<string, any>) {
    return this.adminService.listVerifications(query);
  }

  @Patch('users/:id/verify')
  @AdminPermission(ADMIN_PERMISSIONS.VERIFICATIONS)
  async verifyUser(@Request() req: any, @Param('id') id: string) {
    return this.adminService.verifyUser(id, this.actor(req));
  }

  @Patch('users/:id/reject')
  @AdminPermission(ADMIN_PERMISSIONS.VERIFICATIONS)
  async rejectUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.adminService.rejectUser(id, body?.reason, this.actor(req));
  }

  // ───── User Managers (restricted sub-admins) — primary admin only ───────

  @Post('managers')
  @HttpCode(HttpStatus.CREATED)
  async createManager(@Request() req: any, @Body() dto: CreateAdminManagerDto) {
    return this.adminManagerService.create(req.user.id, dto);
  }

  @Get('managers')
  async listManagers(@Request() req: any) {
    return this.adminManagerService.listForPrimary(req.user.id);
  }

  @Patch('managers/:id')
  async updateManager(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAdminManagerDto,
  ) {
    return this.adminManagerService.update(req.user.id, id, dto);
  }

  @Delete('managers/:id')
  async removeManager(@Request() req: any, @Param('id') id: string) {
    return this.adminManagerService.remove(req.user.id, id);
  }

  // ───── User reports (complaints) ─────────────────────────────────────────

  @Get('reports')
  @AdminPermission(ADMIN_PERMISSIONS.REPORTS)
  async listReports(@Query() query: Record<string, any>) {
    return this.adminService.listReports(query);
  }

  @Patch('reports/:id')
  @AdminPermission(ADMIN_PERMISSIONS.REPORTS)
  async resolveReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport(id, dto, this.actor(req));
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
