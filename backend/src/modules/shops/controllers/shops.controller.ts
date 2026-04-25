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
import { ShopsService } from '../shops.service';
import { CreateShopDto } from '../dto/create-shop.dto';
import { UpdateShopDto } from '../dto/update-shop.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createShopDto: CreateShopDto, @Request() req) {
    return this.shopsService.create(createShopDto);
  }

  @Get()
  async findAll(@Query() query: any) {
    const filters = {
      search: query.search,
      isActive: query.isActive === 'true',
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };
    return this.shopsService.findAll(filters);
  }

  @Get('seller/:sellerId')
  async findBySeller(@Param('sellerId') sellerId: string) {
    return this.shopsService.findBySellerId(sellerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateShopDto: UpdateShopDto,
    @Request() req,
  ) {
    return this.shopsService.update(id, updateShopDto);
  }

  @Patch(':id/follow')
  @UseGuards(JwtAuthGuard)
  async follow(@Param('id') id: string, @Request() req) {
    return this.shopsService.incrementFollowerCount(id);
  }

  @Patch(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('id') id: string, @Request() req) {
    return this.shopsService.decrementFollowerCount(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    await this.shopsService.remove(id);
  }
}
