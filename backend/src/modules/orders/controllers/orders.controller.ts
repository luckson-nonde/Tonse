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
import { Request as ExpressRequest } from 'express';
import { OrdersService } from '../orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user?: { id: string; email: string; role: string };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Orders are created by the buyer
    createOrderDto.buyerId = req.user.id;
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: any, @Request() req) {
    // DATA ISOLATION: Users only see their own orders (as buyer or seller)
    const filters = {
      ...query,
      userId: req.user.id,
    };
    return this.ordersService.findAll(filters);
  }

  @Get('buyer/:buyerId')
  @UseGuards(JwtAuthGuard)
  async findByBuyer(@Param('buyerId') buyerId: string, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Users can only view their own buyer orders
    if (buyerId !== req.user.id) {
      throw new ForbiddenException('You can only view your own orders');
    }
    return this.ordersService.findByBuyer(buyerId);
  }

  @Get('seller/:sellerId')
  @UseGuards(JwtAuthGuard)
  async findBySeller(@Param('sellerId') sellerId: string, @Request() req: AuthenticatedRequest) {
    // ENFORCE: Users can only view their own seller orders
    if (sellerId !== req.user.id) {
      throw new ForbiddenException('You can only view your own orders');
    }
    return this.ordersService.findBySeller(sellerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const order = await this.ordersService.findOne(id);
    // ENFORCE: Users can only view their own orders
    if (order && order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: AuthenticatedRequest
  ) {
    const order = await this.ordersService.findOne(id);
    // ENFORCE: Users can only update their own orders
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own orders');
    }
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Request() req: AuthenticatedRequest
  ) {
    const order = await this.ordersService.findOne(id);
    // ENFORCE: Users can only update their own orders
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own orders');
    }
    return this.ordersService.updateStatus(id, body.status);
  }

  @Patch(':id/tracking')
  @UseGuards(JwtAuthGuard)
  async updateTracking(
    @Param('id') id: string,
    @Body() body: { trackingNumber: string },
    @Request() req: AuthenticatedRequest
  ) {
    const order = await this.ordersService.findOne(id);
    // ENFORCE: Seller can update tracking
    if (order.sellerId !== req.user.id) {
      throw new ForbiddenException('Only the seller can update tracking');
    }
    return this.ordersService.updateTrackingNumber(id, body.trackingNumber);
  }

  @Patch(':id/delivery-date')
  @UseGuards(JwtAuthGuard)
  async updateDeliveryDate(
    @Param('id') id: string,
    @Body() body: { deliveryDate: Date },
    @Request() req: AuthenticatedRequest
  ) {
    const order = await this.ordersService.findOne(id);
    // ENFORCE: Users can only update their own orders
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own orders');
    }
    return this.ordersService.updateDeliveryDate(id, body.deliveryDate);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const order = await this.ordersService.findOne(id);
    // ENFORCE: Only the buyer can delete (cancel) orders
    if (order.buyerId !== req.user.id) {
      throw new ForbiddenException('Only the buyer can delete orders');
    }
    await this.ordersService.remove(id);
  }
}
