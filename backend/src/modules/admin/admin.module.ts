import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserEmail } from '../users/entities/user-email.entity';
import { AdminService } from './admin.service';
import { AdminManagerService } from './admin-manager.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { QuotesModule } from '../quotes/quotes.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';
import { CategoriesModule } from '../categories/categories.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ReportsModule } from '../reports/reports.module';
import { BillingModule } from '../billing/billing.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { AdsModule } from '../ads/ads.module';

@Module({
  imports: [
    // User/UserEmail repos for AdminManagerService (UsersModule exports
    // services only, not its repositories — same workaround as TeamModule).
    TypeOrmModule.forFeature([User, UserEmail]),
    AuthModule,
    UsersModule,
    InquiriesModule,
    QuotesModule,
    PaymentsModule,
    AuditModule,
    CategoriesModule,
    PaymentsModule,
    AuditModule,
    CategoriesModule,
    LedgerModule,
    // Promoter programme: milestone CRUD + promoter oversight.
    ReferralsModule,
    // User-submitted complaints, reviewed under /admin/reports*.
    ReportsModule,
    // Platform monetization switch + prices (Subscriptions tab).
    BillingModule,
    // Public /discover landing-page on/off switch (Landing Page tab).
    SiteSettingsModule,
    // Ad placement pricing + review queue (Ads tab).
    AdsModule,
  ],
  providers: [AdminService, AdminManagerService],
  controllers: [AdminController],
})
export class AdminModule {}
