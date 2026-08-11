import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPosting } from './entities/job-posting.entity';
import { JobPostingCategory } from './entities/job-posting-category.entity';
import { JobApplication } from './entities/job-application.entity';
import { JobBoardService } from './job-board.service';
import { JobApplicationsController, JobPostingsController } from './job-board.controller';
import { CategoriesModule } from '../categories/categories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingModule } from '../billing/billing.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPosting, JobPostingCategory, JobApplication]),
    CategoriesModule,
    NotificationsModule,
    // The admin-controlled posting fee: BillingModule owns the switch+price,
    // LedgerModule the balance-pay journal, PaymentsModule the PSP checkout.
    BillingModule,
    LedgerModule,
    PaymentsModule,
  ],
  providers: [JobBoardService],
  controllers: [JobPostingsController, JobApplicationsController],
  exports: [JobBoardService],
})
export class JobBoardModule {}
