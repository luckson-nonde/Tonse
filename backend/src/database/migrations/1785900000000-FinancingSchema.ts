import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Financed checkout (pay a quote via a lending institution) — schema pieces
 * the feature added to entities without a migration:
 *
 *   notifications_type_enum + 'ORDER_PAID'
 *     → buyer + seller "paid → proceed" alert, fired on cash checkout,
 *       direct purchase, and lender disbursement.
 *   psp_transactions.beneficiaryBuyerId (uuid, nullable)
 *     → the deal's BUYER when the payer differs (lender pays, buyer benefits).
 *   psp_transactions.context (json, nullable)
 *     → funding context for non-cash sources, e.g.
 *       { source:'LOAN', loanQuoteId, loanInquiryId, lenderId }.
 *
 * Dev picks these up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off). Enum name matches the
 * synchronize-created type (see AddReportNotificationTypes precedent).
 */
export class FinancingSchema1785900000000 implements MigrationInterface {
    name = 'FinancingSchema1785900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'ORDER_PAID'`);
        await queryRunner.query(`ALTER TABLE "psp_transactions" ADD COLUMN IF NOT EXISTS "beneficiaryBuyerId" uuid`);
        await queryRunner.query(`ALTER TABLE "psp_transactions" ADD COLUMN IF NOT EXISTS "context" json`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "psp_transactions" DROP COLUMN IF EXISTS "context"`);
        await queryRunner.query(`ALTER TABLE "psp_transactions" DROP COLUMN IF EXISTS "beneficiaryBuyerId"`);
        // Postgres cannot drop enum values in place — 'ORDER_PAID' stays;
        // rows of that type are simply never created once the application
        // code is rolled back (same trade-off as AddReportNotificationTypes).
    }
}
