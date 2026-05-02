import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { QuotesModule } from '../quotes/quotes.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthModule, UsersModule, InquiriesModule, QuotesModule, PaymentsModule, AuditModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
