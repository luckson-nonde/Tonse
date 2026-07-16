import { MigrationInterface, QueryRunner } from "typeorm";

export class MergeLedgerConsentsPsp1784242175947 implements MigrationInterface {
    name = 'MergeLedgerConsentsPsp1784242175947'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "FK_3756cd4fd06b4be90b29be01e11"`);
        await queryRunner.query(`CREATE TABLE "webhook_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying(32) NOT NULL, "eventId" character varying(128) NOT NULL, "type" character varying(32) NOT NULL DEFAULT 'unknown', "reference" character varying(64), "status" character varying(32), "payload" json, "processed" boolean NOT NULL DEFAULT false, "processingError" text, "receivedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4cba37e6a0acb5e1fc49c34ebfd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_webhook_events_reference" ON "webhook_events" ("reference") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_webhook_events_provider_event" ON "webhook_events" ("provider", "eventId") `);
        await queryRunner.query(`CREATE TYPE "public"."psp_transactions_type_enum" AS ENUM('COLLECTION', 'REFUND', 'PAYOUT')`);
        await queryRunner.query(`CREATE TYPE "public"."psp_transactions_status_enum" AS ENUM('PENDING', 'SUCCESSFUL', 'FAILED', 'PAY_OFFLINE', 'CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "public"."psp_transactions_feebearer_enum" AS ENUM('customer', 'merchant')`);
        await queryRunner.query(`CREATE TABLE "psp_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying(64) NOT NULL, "providerReference" character varying(128), "provider" character varying(32) NOT NULL DEFAULT 'sandbox', "type" "public"."psp_transactions_type_enum" NOT NULL, "status" "public"."psp_transactions_status_enum" NOT NULL DEFAULT 'PENDING', "amount" numeric(14,2) NOT NULL, "feeAmount" numeric(14,2) NOT NULL DEFAULT '0', "feeBearer" "public"."psp_transactions_feebearer_enum" NOT NULL DEFAULT 'customer', "currency" character(3) NOT NULL DEFAULT 'ZMW', "quoteId" uuid, "orderId" uuid, "counterpartyId" uuid, "payerMsisdn" character varying(32), "channel" character varying(32), "rawPayload" json, "idempotencyKey" character varying(255) NOT NULL, "lastError" text, "settledAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_32dfa436f5efc4f06c14fa5e6d0" UNIQUE ("reference"), CONSTRAINT "UQ_0aa52ca7d97290605739e754c5a" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_30cc1e99eefb0b2760d85cad495" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_psp_tx_status" ON "psp_transactions" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_psp_tx_quote" ON "psp_transactions" ("quoteId") `);
        await queryRunner.query(`CREATE INDEX "idx_psp_tx_provider_ref" ON "psp_transactions" ("providerReference") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_psp_tx_idempotency" ON "psp_transactions" ("idempotencyKey") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_psp_tx_reference" ON "psp_transactions" ("reference") `);
        await queryRunner.query(`CREATE TYPE "public"."ledger_entries_direction_enum" AS ENUM('DEBIT', 'CREDIT')`);
        await queryRunner.query(`CREATE TABLE "ledger_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "journalId" uuid NOT NULL, "accountId" uuid NOT NULL, "accountCode" character varying(64) NOT NULL, "direction" "public"."ledger_entries_direction_enum" NOT NULL, "amount" numeric(14,2) NOT NULL, "currency" character(3) NOT NULL DEFAULT 'ZMW', "lineNo" integer NOT NULL DEFAULT '0', "counterpartyId" uuid, "counterpartyLabel" character varying(120), "quoteId" uuid, "orderId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ledger_entries_counterparty" ON "ledger_entries" ("counterpartyId") `);
        await queryRunner.query(`CREATE INDEX "idx_ledger_entries_quote" ON "ledger_entries" ("quoteId") `);
        await queryRunner.query(`CREATE INDEX "idx_ledger_entries_account_code" ON "ledger_entries" ("accountCode") `);
        await queryRunner.query(`CREATE INDEX "idx_ledger_entries_journal" ON "ledger_entries" ("journalId") `);
        await queryRunner.query(`CREATE TYPE "public"."ledger_journals_type_enum" AS ENUM('ESCROW_FUNDED', 'ESCROW_RELEASED', 'REFUND_INITIATED', 'REFUND_SETTLED', 'PAYOUT_INITIATED', 'PAYOUT_SETTLED', 'REVERSAL', 'ADJUSTMENT', 'OPENING_BALANCE')`);
        await queryRunner.query(`CREATE TABLE "ledger_journals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying(40) NOT NULL, "type" "public"."ledger_journals_type_enum" NOT NULL, "idempotencyKey" character varying(255) NOT NULL, "currency" character(3) NOT NULL DEFAULT 'ZMW', "quoteId" uuid, "orderId" uuid, "pspTransactionId" uuid, "reversesJournalId" uuid, "description" text, "actorLabel" character varying(120), "memo" json, "postedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f7c7cf7f4e787e50b9401a7a2d3" UNIQUE ("reference"), CONSTRAINT "UQ_1534c879cdf763135509c34bcb8" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_29a6f30e8f1cc9f0d184dcdc78e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ledger_journals_posted_at" ON "ledger_journals" ("postedAt") `);
        await queryRunner.query(`CREATE INDEX "idx_ledger_journals_quote" ON "ledger_journals" ("quoteId") `);
        await queryRunner.query(`CREATE INDEX "idx_ledger_journals_type" ON "ledger_journals" ("type") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_ledger_journals_idempotency" ON "ledger_journals" ("idempotencyKey") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_ledger_journals_reference" ON "ledger_journals" ("reference") `);
        await queryRunner.query(`CREATE TYPE "public"."ledger_accounts_type_enum" AS ENUM('ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE')`);
        await queryRunner.query(`CREATE TYPE "public"."ledger_accounts_normalside_enum" AS ENUM('DEBIT', 'CREDIT')`);
        await queryRunner.query(`CREATE TABLE "ledger_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(64) NOT NULL, "name" character varying(120) NOT NULL, "type" "public"."ledger_accounts_type_enum" NOT NULL, "normalSide" "public"."ledger_accounts_normalside_enum" NOT NULL, "currency" character(3) NOT NULL DEFAULT 'ZMW', "description" text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_38110ab19259ee2e6cf0adc82c5" UNIQUE ("code"), CONSTRAINT "PK_62b34396dda564757cf123fff0e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_ledger_accounts_code" ON "ledger_accounts" ("code") `);
        await queryRunner.query(`CREATE TABLE "user_consents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "noticeKey" character varying(64) NOT NULL, "version" character varying(20) NOT NULL DEFAULT '1', "granted" boolean NOT NULL DEFAULT true, "method" character varying(64), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_65e4c6d6204ad8719abf4b30326" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_consents_user_notice" ON "user_consents" ("userId", "noticeKey") `);
        await queryRunner.query(`CREATE INDEX "idx_user_consents_user" ON "user_consents" ("userId") `);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" ADD "loanTermsDocs" json`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "actorLabel" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" DROP COLUMN "tpin"`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" ADD "tpin" text`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" DROP COLUMN "bozLicenceNumber"`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" ADD "bozLicenceNumber" text`);
        await queryRunner.query(`ALTER TABLE "seller_profiles" DROP COLUMN "tpin"`);
        await queryRunner.query(`ALTER TABLE "seller_profiles" ADD "tpin" text`);
        await queryRunner.query(`ALTER TYPE "public"."quotes_status_enum" RENAME TO "quotes_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."quotes_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'ARCHIVED', 'PAYMENT_PENDING', 'PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP', 'COMPLETED', 'HANDED_OVER', 'SUPERSEDED', 'CANCELLED', 'REFUNDED')`);
        await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "status" TYPE "public"."quotes_status_enum" USING "status"::"text"::"public"."quotes_status_enum"`);
        await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."quotes_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "FK_3756cd4fd06b4be90b29be01e11" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_e205af1ad4c98873d1c624a8bb3" FOREIGN KEY ("journalId") REFERENCES "ledger_journals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_e205af1ad4c98873d1c624a8bb3"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "FK_3756cd4fd06b4be90b29be01e11"`);
        await queryRunner.query(`CREATE TYPE "public"."quotes_status_enum_old" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'ARCHIVED', 'PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP', 'COMPLETED', 'HANDED_OVER', 'SUPERSEDED')`);
        await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "status" TYPE "public"."quotes_status_enum_old" USING "status"::"text"::"public"."quotes_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."quotes_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."quotes_status_enum_old" RENAME TO "quotes_status_enum"`);
        await queryRunner.query(`ALTER TABLE "seller_profiles" DROP COLUMN "tpin"`);
        await queryRunner.query(`ALTER TABLE "seller_profiles" ADD "tpin" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" DROP COLUMN "bozLicenceNumber"`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" ADD "bozLicenceNumber" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" DROP COLUMN "tpin"`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" ADD "tpin" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "actorLabel"`);
        await queryRunner.query(`ALTER TABLE "service_provider_profiles" DROP COLUMN "loanTermsDocs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_consents_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_consents_user_notice"`);
        await queryRunner.query(`DROP TABLE "user_consents"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_accounts_code"`);
        await queryRunner.query(`DROP TABLE "ledger_accounts"`);
        await queryRunner.query(`DROP TYPE "public"."ledger_accounts_normalside_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ledger_accounts_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_journals_reference"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_journals_idempotency"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_journals_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_journals_quote"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_journals_posted_at"`);
        await queryRunner.query(`DROP TABLE "ledger_journals"`);
        await queryRunner.query(`DROP TYPE "public"."ledger_journals_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_entries_journal"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_entries_account_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_entries_quote"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ledger_entries_counterparty"`);
        await queryRunner.query(`DROP TABLE "ledger_entries"`);
        await queryRunner.query(`DROP TYPE "public"."ledger_entries_direction_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_psp_tx_reference"`);
        await queryRunner.query(`DROP INDEX "public"."idx_psp_tx_idempotency"`);
        await queryRunner.query(`DROP INDEX "public"."idx_psp_tx_provider_ref"`);
        await queryRunner.query(`DROP INDEX "public"."idx_psp_tx_quote"`);
        await queryRunner.query(`DROP INDEX "public"."idx_psp_tx_status"`);
        await queryRunner.query(`DROP TABLE "psp_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."psp_transactions_feebearer_enum"`);
        await queryRunner.query(`DROP TYPE "public"."psp_transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."psp_transactions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_webhook_events_provider_event"`);
        await queryRunner.query(`DROP INDEX "public"."idx_webhook_events_reference"`);
        await queryRunner.query(`DROP TABLE "webhook_events"`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "FK_3756cd4fd06b4be90b29be01e11" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
