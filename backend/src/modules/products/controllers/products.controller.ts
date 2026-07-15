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
    // ENFORCE: products are created under the caller's own seller id
    createProductDto.sellerId = req.user.id;
    return this.productsService.create(createProductDto);
  }

  @Get()
  async findAll(@Query() query: any) {
    const filters = {
      ...query,
      isActive: query.isActive === 'true',
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
    const product = await this.productsService.findOne(id);
    if (!product || product.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own products');
    }
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard)
  async updateStock(
    @Param('id') id: string,
    @Body() body: { quantity: number },
    @Request() req,
  ) {
    const product = await this.productsService.findOne(id);
    if (!product || product.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own products');
    }
    return this.productsService.updateStock(id, body.quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const product = await this.productsService.findOne(id);
    if (!product || product.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own products');
    }
    await this.productsService.remove(id);
  }
}
