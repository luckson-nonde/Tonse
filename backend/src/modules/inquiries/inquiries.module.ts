import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './controllers/inquiries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry])],
  providers: [InquiriesService],
  controllers: [InquiriesController],
  exports: [InquiriesService],
})
export class InquiriesModule {}
