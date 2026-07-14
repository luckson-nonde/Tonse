import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuditService } from '../audit.service';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Audit trail. TENANT-SCOPED: every read is confined to the caller's own shop
 * (`providerId = parentProviderId ?? id`) so one provider/lender can never read
 * another's trail (previously every endpoint was global + honoured an arbitrary
 * `providerId` query — a cross-tenant leak). Writes stamp the actor from the
 * JWT so a client can't forge a row into someone else's trail. ADMIN reads the
 * platform-wide trail via the separate /admin/audit surface.
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** The shop the caller's audit reads/writes are confined to. */
  private scope(req: any): string {
    return req.user?.parentProviderId ?? req.user?.id;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAuditLogDto: CreateAuditLogDto, @Request() req) {
    // Never trust body providerId/staffId — stamp them from the JWT so a user
    // can only write audits attributed to themselves / their own shop.
    const scoped = {
      ...createAuditLogDto,
      providerId: this.scope(req),
      staffId: req.user?.id,
    };
    return this.auditService.create(scoped);
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
      // Forced — ignore any client-supplied providerId.
      providerId: this.scope(req),
    };
    return this.auditService.findAll(filters);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit: number,
    @Request() req,
  ) {
    return this.auditService.findByUser(userId, limit, this.scope(req));
  }

  @Get('entity/:entityType/:entityId')
  @UseGuards(JwtAuthGuard)
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Request() req,
  ) {
    return this.auditService.findByEntity(entityType, entityId, this.scope(req));
  }

  @Get('action/:action')
  @UseGuards(JwtAuthGuard)
  async findByAction(
    @Param('action') action: string,
    @Query('limit') limit: number,
    @Request() req,
  ) {
    return this.auditService.findByAction(action, limit, this.scope(req));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    const log = await this.auditService.findOne(id);
    if (
      log &&
      log.providerId &&
      log.providerId !== this.scope(req) &&
      req.user?.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('You do not have access to this audit record');
    }
    return log;
  }
}
