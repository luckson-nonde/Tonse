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
} from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any, @Request() req) {
    const filters = {
      userId: query.userId,
      type: query.type,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };
    return this.paymentsService.findAll(filters);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string) {
    return this.paymentsService.findByUser(userId);
  }

  @Get('type/:type')
  @UseGuards(JwtAuthGuard)
  async findByType(@Param('type') type: string) {
    return this.paymentsService.findByType(type);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req,
  ) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Request() req,
  ) {
    return this.paymentsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    await this.paymentsService.remove(id);
  }
}
