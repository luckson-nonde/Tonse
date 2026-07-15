import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { SchedulesService } from '../schedules.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createScheduleDto: CreateScheduleDto, @Request() req) {
    // ENFORCE: schedule items are created under the caller's own user id
    createScheduleDto.userId = req.user.id;
    return this.schedulesService.create(createScheduleDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any, @Request() req) {
    const filters = {
      userId: query.userId,
      type: query.type,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };
    return this.schedulesService.findAll(filters);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string, @Request() req) {
    if (userId !== req.user.id) {
      throw new ForbiddenException('You can only view your own schedule');
    }
    return this.schedulesService.findByUser(userId);
  }

  @Get('user/:userId/range')
  @UseGuards(JwtAuthGuard)
  async findByDateRange(
    @Param('userId') userId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Request() req,
  ) {
    if (userId !== req.user.id) {
      throw new ForbiddenException('You can only view your own schedule');
    }
    return this.schedulesService.findByDateRange(userId, new Date(dateFrom), new Date(dateTo));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Request() req,
  ) {
    const schedule = await this.schedulesService.findOne(id);
    if (!schedule || schedule.userId !== req.user.id) {
      throw new ForbiddenException('You can only update your own schedule');
    }
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Request() req,
  ) {
    const schedule = await this.schedulesService.findOne(id);
    if (!schedule || schedule.userId !== req.user.id) {
      throw new ForbiddenException('You can only update your own schedule');
    }
    return this.schedulesService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const schedule = await this.schedulesService.findOne(id);
    if (!schedule || schedule.userId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own schedule');
    }
    await this.schedulesService.remove(id);
  }
}
