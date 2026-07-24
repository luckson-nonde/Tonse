import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from '../quotes/entities/quote.entity';
import { PaymentsModule } from '../payments/payments.module';
import { LedgerModule } from '../ledger/ledger.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quote]), PaymentsModule, LedgerModule],
  controllers: [CollectionController],
  providers: [CollectionService],
})
export class CollectionModule {}
