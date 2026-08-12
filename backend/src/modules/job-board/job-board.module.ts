import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPosting } from './entities/job-posting.entity';
import { JobPostingCategory } from './entities/job-posting-category.entity';
import { JobApplication } from './entities/job-application.entity';
import { JobBoardService } from './job-board.service';
import { JobApplicationsController, JobPostingsController } from './job-board.controller';
import { PublicJobPostingsController } from './public-job-board.controller';
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
  // PublicJobPostingsController MUST be registered before JobPostingsController:
  // Nest/Express matches routes in registration order, and JobPostingsController's
  // guarded `GET /job-postings/:id` (:id = ANY single segment) would otherwise
  // swallow `GET /job-postings/public` first — matching literal 'public' as an
  // id — and 401 it before the unguarded controller's exact route is even tried.
  // (`/job-postings/public/:id`, two segments, was never at risk — it can't
  // match a one-segment `:id` route regardless of order.) Same "specific before
  // greedy" rule job-board.controller.ts's own comment already documents for
  // 'mine'/'feed' within a single controller, just spanning two controllers here.
  controllers: [PublicJobPostingsController, JobPostingsController, JobApplicationsController],
  exports: [JobBoardService],
})
export class JobBoardModule {}
