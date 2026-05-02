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
