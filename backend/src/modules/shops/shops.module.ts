import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from './entities/shop.entity';
import { ShopsService } from './shops.service';
import { ShopsController } from './controllers/shops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shop])],
  providers: [ShopsService],
  controllers: [ShopsController],
  exports: [ShopsService],
})
export class ShopsModule {}
