import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingSettings } from './entities/billing-settings.entity';
import { ShopSubscription } from './entities/shop-subscription.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingSettings, ShopSubscription]),
    // Subscription renewals write a payments ledger row.
    PaymentsModule,
  ],
  providers: [BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
