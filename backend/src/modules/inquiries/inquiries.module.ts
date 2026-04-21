import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { InquiryImage } from './entities/inquiry-image.entity';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './controllers/inquiries.controller';
import { InquiryImagesService } from './services/inquiry-images.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, InquiryImage])],
  providers: [InquiriesService, InquiryImagesService],
  controllers: [InquiriesController],
  exports: [InquiriesService, InquiryImagesService],
})
export class InquiriesModule {}
