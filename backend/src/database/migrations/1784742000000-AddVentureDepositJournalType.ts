import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Venture account direct deposits: one new ledger journal type —
 *   VENTURE_DEPOSIT → a seller deposits their own money into their venture
 *   account (Dr PSP_HOLDING_ZMW / Cr SELLER_PAYABLE_ZMW), independent of any
 *   quote/sale.
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off). Enum name matches the
 * synchronize-created ledger_journals_type_enum (created in
 * 1784242175947-MergeLedgerConsentsPsp.ts).
 */
export class AddVentureDepositJournalType1784742000000 implements MigrationInterface {
    name = 'AddVentureDepositJournalType1784742000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."ledger_journals_type_enum" ADD VALUE IF NOT EXISTS 'VENTURE_DEPOSIT'`);
    }

    public async down(): Promise<void> {
        // Postgres cannot drop enum values in place — removing them would
        // require recreating the type and rewriting the column. Accepted as
        // irreversible; rows of the new type are simply never created once
        // the application code is rolled back.
    }
}
