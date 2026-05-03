import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamService } from './team.service';
import { UsersService } from '../users/users.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

/**
 * Team Controller — endpoints for owners to manage their staff.
 *
 * All routes require auth and resolve the parent provider from the
 * JWT subject. Staff trying to call these get a ForbiddenException.
 *
 *   POST   /team/members        create staff (returns generated
 *                                password once if not supplied)
 *   GET    /team/members        list staff for the calling owner
 *   PATCH  /team/members/:id    update staff (perms / assignedArchetype /
 *                                contact info / isActive)
 *   DELETE /team/members/:id    remove staff
 */
@Controller('team/members')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateTeamMemberDto) {
    const parent = await this.requireParent(req.user.id);
    return this.teamService.create(parent, dto);
  }

  @Get()
  async list(@Request() req: any) {
    const parent = await this.requireParent(req.user.id);
    return this.teamService.listForParent(parent);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    const parent = await this.requireParent(req.user.id);
    return this.teamService.update(parent, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const parent = await this.requireParent(req.user.id);
    return this.teamService.remove(parent, id);
  }

  /**
   * Resolve the calling user, ensure they're a top-level provider
   * (not a staff member managing their own team). Used by every
   * route in this controller as the auth gate.
   */
  private async requireParent(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new ForbiddenException('User not found');
    if (user.parentProviderId) {
      throw new ForbiddenException(
        'Only top-level providers can manage team members',
      );
    }
    return user;
  }
}
