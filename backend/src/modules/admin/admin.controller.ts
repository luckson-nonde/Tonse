import { Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming these exist
// import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('clear-all-data')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard) // Add security later
  async clearAllData() {
    await this.adminService.clearAllData();
    return {
      message: 'All transactional data has been cleared successfully.',
      timestamp: new Date().toISOString(),
    };
  }
}
