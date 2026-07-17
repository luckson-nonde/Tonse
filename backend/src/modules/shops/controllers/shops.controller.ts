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
    // ENFORCE: shops are created under the caller's own seller id
    createShopDto.sellerId = req.user.id;
    return this.shopsService.create(createShopDto);
  }

  @Get()
  async findAll(@Query() query: any) {
    const filters = {
      search: query.search,
      category: query.category,
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

  /** Ids of shops the caller has favorited. Static route — declared before
   *  @Get(':id') so 'me' isn't captured as an id. */
  @Get('me/favorites')
  @UseGuards(JwtAuthGuard)
  async listFavorites(@Request() req) {
    const shopIds = await this.shopsService.listFavoriteShopIds(req.user.id);
    return { shopIds };
  }

  /** Full provider profile — must be declared before @Get(':id') */
  @Get(':id/profile')
  async findProfile(@Param('id') profileId: string) {
    return this.shopsService.findProfile(profileId);
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
    const shop = await this.shopsService.findOne(id);
    if (!shop || shop.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own shop');
    }
    return this.shopsService.update(id, updateShopDto);
  }

  // follow/unfollow are legitimately performed by OTHER users on this
  // shop (e.g. a buyer following a seller) — no ownership check here.
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

  // A buyer favorites / unfavorites a shop card for their own "Favorites"
  // list. Actor is the caller (JWT), never the body. Favoriting is
  // idempotent (unique index); unfavoriting a non-favorite is a no-op.
  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  async favorite(@Param('id') id: string, @Request() req) {
    return this.shopsService.favoriteShop(req.user.id, id);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfavorite(@Param('id') id: string, @Request() req) {
    await this.shopsService.unfavoriteShop(req.user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const shop = await this.shopsService.findOne(id);
    if (!shop || shop.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own shop');
    }
    await this.shopsService.remove(id);
  }
}
