import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerJournal } from './entities/ledger-journal.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerService } from './ledger.service';
import { LedgerBootstrapService } from './ledger-bootstrap.service';

/**
 * The double-entry ledger — ProQuote's mirror of money the PSP custodies.
 *
 * Exported so the flows that move money (collection/release, payments/webhook,
 * refunds) can post journals inside their own transactions. Nothing else may
 * write to the ledger tables.
 */
@Module({
  imports: [TypeOrmModule.forFeature([LedgerAccount, LedgerJournal, LedgerEntry])],
  providers: [LedgerService, LedgerBootstrapService],
  exports: [LedgerService],
})
export class LedgerModule {}
