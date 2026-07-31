import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { DirectOrderService } from './direct-order.service';
import { ProductsController } from './controllers/products.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  // Ledger: direct purchases post the ESCROW_FUNDED journal themselves.
  // Notifications: the seller gets an ORDER_PAID alert on every sale.
  imports: [TypeOrmModule.forFeature([Product]), LedgerModule, NotificationsModule],
  providers: [ProductsService, DirectOrderService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
