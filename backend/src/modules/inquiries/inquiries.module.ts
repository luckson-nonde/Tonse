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

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, InquiryImage, InquiryCategory]),
    UsersModule,
    CategoriesModule,
  ],
  providers: [InquiriesService, InquiryImagesService, MatchingService],
  controllers: [InquiriesController],
  exports: [InquiriesService, InquiryImagesService, MatchingService],
})
export class InquiriesModule {}
