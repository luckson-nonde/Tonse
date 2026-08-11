import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Admin-controlled job-posting fee:
 *   - billing_settings gains the switch + price (jobPostingFeeEnabled OFF by
 *     default, so this deploy never starts charging until an admin turns it on);
 *   - job_postings gains a PENDING_PAYMENT status (a posting created while the
 *     fee is on parks here until paid, invisible to the admin queue) and a
 *     feeAmount snapshot of the price charged at creation;
 *   - ledger_journals gains the JOB_POST_FEE type (Dr PSP_HOLDING or
 *     SELLER_PAYABLE / Cr JOB_BOARD_REVENUE_ZMW — the account row itself is
 *     seeded by LedgerBootstrapService's insert-only pass on boot).
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class JobPostingFee1786120000000 implements MigrationInterface {
    name = 'JobPostingFee1786120000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "billing_settings" ADD "jobPostingFeeEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "billing_settings" ADD "jobPostingFee" numeric(10,2) NOT NULL DEFAULT '50'`);
        await queryRunner.query(`ALTER TABLE "job_postings" ADD "feeAmount" numeric(10,2)`);
        await queryRunner.query(`ALTER TYPE "public"."job_postings_status_enum" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT' BEFORE 'PENDING_APPROVAL'`);
        await queryRunner.query(`ALTER TYPE "public"."ledger_journals_type_enum" ADD VALUE IF NOT EXISTS 'JOB_POST_FEE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Enum values cannot be dropped in place (Postgres limitation, same
        // stance as AddVentureDepositJournalType); the added columns can.
        await queryRunner.query(`ALTER TABLE "job_postings" DROP COLUMN "feeAmount"`);
        await queryRunner.query(`ALTER TABLE "billing_settings" DROP COLUMN "jobPostingFee"`);
        await queryRunner.query(`ALTER TABLE "billing_settings" DROP COLUMN "jobPostingFeeEnabled"`);
    }
}
