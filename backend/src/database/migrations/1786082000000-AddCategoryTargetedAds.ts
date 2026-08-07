import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Category-targeted ad rail: a CATEGORY_SIDEBAR placement plus the
 * targetCategoryId slug it keys on, so a buyer browsing Electronics sees
 * electronics ads and one browsing Loans sees lender ads. NULL targeting
 * means "all categories" — the fallback that keeps the rail populated in a
 * category nobody has bought yet.
 *
 * Enum ALTER runs in its own transaction-safe ADD VALUE (same pattern as
 * AddVentureDepositJournalType); the column ADD is plain DDL.
 */
export class AddCategoryTargetedAds1786082000000 implements MigrationInterface {
    name = 'AddCategoryTargetedAds1786082000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."advertisements_placementlocation_enum" ADD VALUE IF NOT EXISTS 'CATEGORY_SIDEBAR'`);
        await queryRunner.query(`ALTER TABLE "advertisements" ADD COLUMN IF NOT EXISTS "targetCategoryId" character varying(100)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ads_target_category" ON "advertisements" ("targetCategoryId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_ads_target_category"`);
        await queryRunner.query(`ALTER TABLE "advertisements" DROP COLUMN IF EXISTS "targetCategoryId"`);
        // Postgres cannot drop an enum value in place — CATEGORY_SIDEBAR stays
        // (same accepted irreversibility as the ledger journal-type migrations).
    }
}
