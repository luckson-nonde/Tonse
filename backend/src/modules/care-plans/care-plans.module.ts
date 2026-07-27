import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarePlan } from './entities/care-plan.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { CarePlansService } from './care-plans.service';
import { CarePlansController } from './care-plans.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CarePlan, Quote]),
    // Monthly renewals write a payments ledger row (billing-module pattern).
    PaymentsModule,
  ],
  providers: [CarePlansService],
  controllers: [CarePlansController],
  exports: [CarePlansService],
})
export class CarePlansModule {}
