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
    const user = await this.usersService.findById(req.user.id);
    return this.usersService.flattenWithProfile(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return this.usersService.flattenWithProfile(user);
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
