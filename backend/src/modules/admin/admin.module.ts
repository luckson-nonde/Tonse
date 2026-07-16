import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { QuotesModule } from '../quotes/quotes.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';
import { CategoriesModule } from '../categories/categories.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    InquiriesModule,
    QuotesModule,
    PaymentsModule,
    AuditModule,
    CategoriesModule,
    LedgerModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
