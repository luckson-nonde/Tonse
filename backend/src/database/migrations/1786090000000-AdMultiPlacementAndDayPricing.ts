import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ads become multi-placement, and pricing becomes a function of DAYS ONLY.
 *
 *  1. `placementLocation` (single enum) → `placements` (json array). BUNDLE_ALL
 *     was always a stand-in for "more than one place", so legacy bundle rows
 *     expand into all three real placements and the enum type is retired.
 *     Converted in place with ALTER … TYPE … USING + RENAME, the same atomic
 *     shape CatalogRichListings used for products.images.
 *  2. `ad_settings.baseRates` (per-placement map) → `baseRatePerDay` (one
 *     rate). Backfilled from the old HOMEPAGE_CENTER rate so an admin who had
 *     tuned their prices keeps the headline number rather than snapping back
 *     to the default.
 *
 * No index on `placements`: json arrays here are JS-filtered after load
 * (jobs.service.ts invariant), so an index would never be consulted.
 */
export class AdMultiPlacementAndDayPricing1786090000000 implements MigrationInterface {
    name = 'AdMultiPlacementAndDayPricing1786090000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_ads_placement"`);
        await queryRunner.query(`
            ALTER TABLE "advertisements"
            ALTER COLUMN "placementLocation" TYPE json
            USING (
              CASE WHEN "placementLocation"::text = 'BUNDLE_ALL'
                   THEN '["HOMEPAGE_CENTER","SECONDARY_SIDEBAR","CATEGORY_SIDEBAR"]'::json
                   ELSE json_build_array("placementLocation"::text)
              END
            )
        `);
        await queryRunner.query(`ALTER TABLE "advertisements" RENAME COLUMN "placementLocation" TO "placements"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."advertisements_placementlocation_enum"`);

        await queryRunner.query(`ALTER TABLE "ad_settings" ADD COLUMN IF NOT EXISTS "baseRatePerDay" numeric(10,2) NOT NULL DEFAULT 8`);
        await queryRunner.query(`
            UPDATE "ad_settings"
               SET "baseRatePerDay" = COALESCE(("baseRates"->>'HOMEPAGE_CENTER')::numeric, 8)
             WHERE "baseRates" IS NOT NULL
        `);
        await queryRunner.query(`ALTER TABLE "ad_settings" DROP COLUMN IF EXISTS "baseRates"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_settings" ADD COLUMN IF NOT EXISTS "baseRates" json`);
        await queryRunner.query(`
            UPDATE "ad_settings"
               SET "baseRates" = json_build_object(
                     'HOMEPAGE_CENTER', "baseRatePerDay",
                     'SECONDARY_SIDEBAR', "baseRatePerDay",
                     'CATEGORY_SIDEBAR', "baseRatePerDay",
                     'BUNDLE_ALL', "baseRatePerDay")
        `);
        await queryRunner.query(`ALTER TABLE "ad_settings" DROP COLUMN IF EXISTS "baseRatePerDay"`);

        await queryRunner.query(`CREATE TYPE "public"."advertisements_placementlocation_enum" AS ENUM('HOMEPAGE_CENTER', 'SECONDARY_SIDEBAR', 'CATEGORY_SIDEBAR', 'BUNDLE_ALL')`);
        await queryRunner.query(`ALTER TABLE "advertisements" RENAME COLUMN "placements" TO "placementLocation"`);
        // Multi-placement rows can't round-trip into one value — the first
        // placement wins, which is the best a single-valued column can hold.
        await queryRunner.query(`
            ALTER TABLE "advertisements"
            ALTER COLUMN "placementLocation" TYPE "public"."advertisements_placementlocation_enum"
            USING (("placementLocation"->>0)::"public"."advertisements_placementlocation_enum")
        `);
        await queryRunner.query(`CREATE INDEX "idx_ads_placement" ON "advertisements" ("placementLocation")`);
    }
}
