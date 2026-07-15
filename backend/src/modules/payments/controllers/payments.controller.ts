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
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

// Payments are a financial ledger: a caller may only ever create a payment
// for themselves (status always starts PENDING, never client-settable), read
// their own payments, and every state-changing/administrative route
// (status transitions, edits, deletes, cross-user listing) is admin-only.
// A real gateway callback should drive `updateStatus`, not the end user.
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    createPaymentDto.userId = req.user.id;
    createPaymentDto.status = 'PENDING';
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req) {
    const filters = {
      ...query,
      userId: req.user.id,
    };
    return this.paymentsService.findAll(filters);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string, @Request() req) {
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return this.paymentsService.findByUser(userId);
  }

  @Get('type/:type')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async findByType(@Param('type') type: string) {
    return this.paymentsService.findByType(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const payment = await this.paymentsService.findOne(id);
    if (!payment) {
      throw new NotFoundException();
    }
    if (payment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return payment;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.paymentsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.paymentsService.remove(id);
  }
}
