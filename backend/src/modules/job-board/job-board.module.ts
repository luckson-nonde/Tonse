import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPosting } from './entities/job-posting.entity';
import { JobPostingCategory } from './entities/job-posting-category.entity';
import { JobApplication } from './entities/job-application.entity';
import { JobBoardService } from './job-board.service';
import { JobApplicationsController, JobPostingsController } from './job-board.controller';
import { CategoriesModule } from '../categories/categories.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPosting, JobPostingCategory, JobApplication]),
    CategoriesModule,
    NotificationsModule,
  ],
  providers: [JobBoardService],
  controllers: [JobPostingsController, JobApplicationsController],
  exports: [JobBoardService],
})
export class JobBoardModule {}
