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
import { ProductsService } from '../products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  async findAll(@Query() query: any) {
    const filters = {
      sellerId: query.sellerId,
      category: query.category,
      search: query.search,
      isActive: query.isActive === 'true',
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };
    return this.productsService.findAll(filters);
  }

  @Get('seller/:sellerId')
  async findBySeller(@Param('sellerId') sellerId: string) {
    return this.productsService.findBySeller(sellerId);
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string) {
    return this.productsService.findByCategory(category);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    await this.productsService.incrementViewCount(id);
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard)
  async updateStock(
    @Param('id') id: string,
    @Body() body: { quantity: number },
    @Request() req,
  ) {
    return this.productsService.updateStock(id, body.quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    await this.productsService.remove(id);
  }
}
