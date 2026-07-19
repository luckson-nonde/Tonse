import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { User } from '../users/entities/user.entity';
import { JobMedia } from './entities/job-media.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, JobMedia, Inquiry, User]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
