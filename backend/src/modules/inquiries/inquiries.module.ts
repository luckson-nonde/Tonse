import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { InquiryImage } from './entities/inquiry-image.entity';
import { InquiryCategory } from './entities/inquiry-category.entity';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './controllers/inquiries.controller';
import { InquiryImagesService } from './services/inquiry-images.service';
import { MatchingService } from './services/matching.service';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, InquiryImage, InquiryCategory]),
    UsersModule,
    CategoriesModule,
    // Dispatch: NEW_LEAD fan-out on create, reserve-release notifications.
    // (NotificationsModule imports only the Inquiry ENTITY, so no cycle.)
    NotificationsModule,
  ],
  providers: [InquiriesService, InquiryImagesService, MatchingService],
  controllers: [InquiriesController],
  exports: [InquiriesService, InquiryImagesService, MatchingService],
})
export class InquiriesModule {}
