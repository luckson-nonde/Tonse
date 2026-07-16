import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    return this.usersService.flattenWithProfile(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return this.usersService.flattenWithProfile(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll(@Query() query: any) {
    const filters = {
      role: query.role,
      verificationStatus: query.verificationStatus,
      isActive: query.isActive === 'true',
      page: query.page,
      limit: query.limit,
    };
    const result = await this.usersService.findAll(filters);
    // Phase 3: each row in the listing also gets its active profile merged
    // so admin search / list views show the right name, email, companyName.
    const flatData = await Promise.all(
      result.data.map((u) => this.usersService.flattenWithProfile(u))
    );
    return { ...result, data: flatData };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // Implement authorization check - user can only update their own profile
    if (req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    // service.update() splits the payload (auth fields → users, everything
    // else → active profile) per the Phase 3 contract and returns the user.
    // Flatten before responding so the frontend sees the merged shape.
    const user = await this.usersService.update(id, updateUserDto);
    return this.usersService.flattenWithProfile(user);
  }

  /**
   * GET /users/:id/deletion-check — pre-flight for account deletion. Self-only.
   * Reports whether the account can be erased and what stands in the way: hard
   * blocks (funds held in escrow, as seller or buyer) vs soft warnings (open
   * orders/offers/inquiries/loans). The frontend uses this to block or warn
   * BEFORE the user commits; the actual DELETE re-checks server-side.
   */
  @Get(':id/deletion-check')
  @UseGuards(JwtAuthGuard)
  async deletionCheck(@Param('id') id: string, @Request() req) {
    if (req.user.id !== id) {
      throw new ForbiddenException();
    }
    return this.usersService.getDeletionBlockers(id);
  }

  /**
   * DELETE /users/:id — permanent account deletion. Self-only: a user can only
   * delete their OWN account. Irreversibly purges the user and ALL their data
   * (inquiries, quotes, orders, payments, products, shops, schedules, profiles,
   * audit logs, staff, and uploaded files) — see usersService.deleteAccount.
   * Blocked (409) while funds are held in escrow — see getDeletionBlockers.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.id !== id) {
      throw new ForbiddenException('You can only delete your own account');
    }
    await this.usersService.deleteAccount(id);
  }

  /**
   * Verify a candidate PIN against the user's stored PIN. For staff
   * (parentProviderId set) the PIN lives on `users.pin` (per-user,
   * Phase 5 department-head model); for owners it lives on the
   * active profile. Compare happens server-side so the actual PIN
   * value never reaches the wire — response is a plain boolean.
   */
  @Post(':id/pin/verify')
  @UseGuards(JwtAuthGuard)
  async verifyPin(
    @Param('id') id: string,
    @Body() body: { pin?: string },
    @Request() req,
  ) {
    if (req.user.id !== id) {
      throw new ForbiddenException();
    }
    const valid = await this.usersService.verifyProfilePin(id, body?.pin ?? '');
    return { valid };
  }

  /**
   * Set (or change) the calling user's PIN. Mirrors the verify
   * endpoint's staff/owner branching — staff write to users.pin,
   * owners to their active profile. The 4-digit shape is enforced
   * inside usersService.setProfilePin.
   */
  @Post(':id/pin')
  @UseGuards(JwtAuthGuard)
  async setPin(
    @Param('id') id: string,
    @Body() body: { pin?: string },
    @Request() req,
  ) {
    if (req.user.id !== id) {
      throw new ForbiddenException();
    }
    await this.usersService.setProfilePin(id, body?.pin ?? '');
    return { success: true };
  }

  /**
   * Change the calling user's password. Used by the
   * ForcePasswordChange flow when a staff member logs in with the
   * generated password and has `mustChangePassword=true`. bcrypt-
   * hashes the new value server-side and clears mustChangePassword
   * in the same write. Sits outside UpdateUserDto on purpose —
   * password writes should never flow through the generic update
   * path because (a) the value would land in the column unhashed,
   * (b) it deserves a tighter auth gate.
   */
  @Post(':id/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Param('id') id: string,
    @Body() body: ChangePasswordDto,
    @Request() req,
  ) {
    if (req.user.id !== id) {
      throw new ForbiddenException();
    }
    await this.usersService.changePassword(id, body.password, body.currentPassword);
    return { success: true };
  }
}
