import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuditService } from '../audit.service';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAuditLogDto: CreateAuditLogDto, @Request() req) {
    return this.auditService.create(createAuditLogDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any, @Request() req) {
    const filters = {
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
    };
    return this.auditService.findAll(filters);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string, @Query('limit') limit: number) {
    return this.auditService.findByUser(userId, limit);
  }

  @Get('entity/:entityType/:entityId')
  @UseGuards(JwtAuthGuard)
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }

  @Get('action/:action')
  @UseGuards(JwtAuthGuard)
  async findByAction(@Param('action') action: string, @Query('limit') limit: number) {
    return this.auditService.findByAction(action, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
