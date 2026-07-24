import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentsModule } from '../payments/payments.module';
import { VentureController } from './venture.controller';

@Module({
  imports: [LedgerModule, PaymentsModule],
  controllers: [VentureController],
})
export class VentureModule {}
