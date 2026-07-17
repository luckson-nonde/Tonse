import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from './entities/shop.entity';
import { ShopFavorite } from './entities/shop-favorite.entity';
import { ShopsService } from './shops.service';
import { ShopsController } from './controllers/shops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, ShopFavorite])],
  providers: [ShopsService],
  controllers: [ShopsController],
  exports: [ShopsService],
})
export class ShopsModule {}
