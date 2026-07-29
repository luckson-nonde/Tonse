import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { QuotesModule } from '../quotes/quotes.module';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';
import { ConsentsModule } from '../consents/consents.module';
import { FinancingController } from './financing.controller';
import { FinancingService } from './financing.service';

/**
 * Financed checkout: bridges the marketplace quote flow and the lending vertical.
 * Reuses QuotesService (link + status), InquiriesService (loan request),
 * CheckoutService.initiateDisbursement (verified PSP settlement) and
 * ConsentsService (payroll-deduction consent) — no new money primitives.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Quote]),
    QuotesModule,
    InquiriesModule,
    PaymentsModule,
    AuditModule,
    ConsentsModule,
  ],
  controllers: [FinancingController],
  providers: [FinancingService],
})
export class FinancingModule {}
