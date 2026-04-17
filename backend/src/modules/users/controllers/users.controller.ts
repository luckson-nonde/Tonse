import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any) {
    const filters = {
      role: query.role,
      verificationStatus: query.verificationStatus,
      isActive: query.isActive === 'true',
      page: query.page,
      limit: query.limit,
    };
    return this.usersService.findAll(filters);
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
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    // Implement authorization check
    if (req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    await this.usersService.remove(id);
  }
}
