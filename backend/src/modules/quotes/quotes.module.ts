import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { QuotesService } from './quotes.service';
import { QuotesController } from './controllers/quotes.controller';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  // ReferralsModule: trade_complete funnel hook on quote COMPLETED/HANDED_OVER.
  imports: [
    TypeOrmModule.forFeature([Quote]),
    InquiriesModule,
    NotificationsModule,
    ReferralsModule,
    AuditModule,
  ],
  providers: [QuotesService],
  controllers: [QuotesController],
  exports: [QuotesService],
})
export class QuotesModule {}
