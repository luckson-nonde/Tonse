import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Seller ad placements: the advertisements table (one row per purchased ad,
 * lifecycle PENDING_PAYMENT → PENDING_APPROVAL → APPROVED/REJECTED, with the
 * live window set at approval), the ad_settings pricing singleton
 * (get-or-create, same shape as billing/site settings), and two new ledger
 * journal types — AD_PURCHASE (Dr PSP_HOLDING or SELLER_PAYABLE / Cr
 * AD_REVENUE) and AD_REJECTED_REFUND (the mirror credit back to the seller
 * on admin rejection). The AD_REVENUE_ZMW account itself is seeded at boot
 * by LedgerBootstrapService, not here.
 *
 * DDL (column shapes, enum names, index/PK names) mirrors exactly what
 * DB_SYNCHRONIZE=true creates in dev, so the two paths cannot drift. Prod
 * applies this migration (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class CreateAdvertisements1786081000000 implements MigrationInterface {
    name = 'CreateAdvertisements1786081000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."advertisements_mediatype_enum" AS ENUM('IMAGE', 'VIDEO')`);
        await queryRunner.query(`CREATE TYPE "public"."advertisements_placementlocation_enum" AS ENUM('HOMEPAGE_CENTER', 'SECONDARY_SIDEBAR', 'BUNDLE_ALL')`);
        await queryRunner.query(`CREATE TYPE "public"."advertisements_status_enum" AS ENUM('PENDING_PAYMENT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "advertisements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sellerId" uuid NOT NULL, "title" character varying(255) NOT NULL, "targetUrl" character varying(500) NOT NULL, "mediaType" "public"."advertisements_mediatype_enum" NOT NULL, "mediaUrl" character varying(500) NOT NULL, "videoDurationSeconds" numeric(5,2), "placementLocation" "public"."advertisements_placementlocation_enum" NOT NULL, "startDate" TIMESTAMP, "endDate" TIMESTAMP, "durationDays" integer NOT NULL, "totalPaidAmount" numeric(10,2) NOT NULL, "currency" character(3) NOT NULL DEFAULT 'ZMW', "status" "public"."advertisements_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT', "rejectionReason" text, "approvedByAdminId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4818a08332624787e5b2bf82302" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ads_seller" ON "advertisements" ("sellerId")`);
        await queryRunner.query(`CREATE INDEX "idx_ads_status" ON "advertisements" ("status")`);
        await queryRunner.query(`CREATE INDEX "idx_ads_placement" ON "advertisements" ("placementLocation")`);
        await queryRunner.query(`CREATE TABLE "ad_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "baseRates" json, "discountTiers" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dda72972fcc9f2ab921276b4b2d" PRIMARY KEY ("id"))`);
        // Same in-transaction ADD VALUE pattern as AddVentureDepositJournalType
        // (safe on PG 12+ as long as the value isn't used in this transaction).
        await queryRunner.query(`ALTER TYPE "public"."ledger_journals_type_enum" ADD VALUE IF NOT EXISTS 'AD_PURCHASE'`);
        await queryRunner.query(`ALTER TYPE "public"."ledger_journals_type_enum" ADD VALUE IF NOT EXISTS 'AD_REJECTED_REFUND'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "ad_settings"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ads_placement"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ads_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ads_seller"`);
        await queryRunner.query(`DROP TABLE "advertisements"`);
        await queryRunner.query(`DROP TYPE "public"."advertisements_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."advertisements_placementlocation_enum"`);
        await queryRunner.query(`DROP TYPE "public"."advertisements_mediatype_enum"`);
        // Enum values added to ledger_journals_type_enum stay — Postgres cannot
        // drop enum values in place (same accepted irreversibility as
        // AddVentureDepositJournalType).
    }
}
