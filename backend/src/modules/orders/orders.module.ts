import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './controllers/orders.controller';
import { ReferralsModule } from '../referrals/referrals.module';
import { UsersModule } from '../users/users.module';

@Module({
  // ReferralsModule: trade_complete funnel hook on order completion.
  // UsersModule: counterparty display-name hydration on order lists.
  imports: [TypeOrmModule.forFeature([Order]), ReferralsModule, UsersModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
