import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdSettings } from './entities/ad-settings.entity';
import { Advertisement } from './entities/advertisement.entity';
import { AdsService } from './ads.service';
import { AdsMediaSweepService } from './ads-media-sweep.service';
import { AdsController } from './ads.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([AdSettings, Advertisement]), LedgerModule, PaymentsModule],
  providers: [AdsService, AdsMediaSweepService],
  controllers: [AdsController],
  exports: [AdsService],
})
export class AdsModule {}
