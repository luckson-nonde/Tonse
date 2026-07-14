import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { QuotesModule } from '../quotes/quotes.module';
import { AuditModule } from '../audit/audit.module';
import { InquiriesModule } from '../inquiries/inquiries.module';
import { LoanController } from './loans.controller';
import { LoanService } from './loans.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quote]), QuotesModule, AuditModule, InquiriesModule],
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}
