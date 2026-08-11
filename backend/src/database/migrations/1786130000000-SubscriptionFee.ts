import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Shop subscriptions become a real, PSP-verified payment: one new ledger
 * journal type — SUBSCRIPTION_FEE (Dr PSP_HOLDING / Cr the new
 * SUBSCRIPTION_REVENUE_ZMW account, which LedgerBootstrapService's
 * insert-only pass seeds on boot; accounts are rows, not enum values, so
 * only the journal type needs DDL).
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off). Safe inside the migration
 * transaction because the new value is never used until the app is up —
 * same stance as AddVentureDepositJournalType / JobPostingFee.
 */
export class SubscriptionFee1786130000000 implements MigrationInterface {
    name = 'SubscriptionFee1786130000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."ledger_journals_type_enum" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_FEE'`);
    }

    public async down(): Promise<void> {
        // Postgres cannot drop enum values in place — accepted as
        // irreversible; rolled-back code simply never writes the new type.
    }
}
