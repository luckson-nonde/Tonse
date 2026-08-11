import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Spotlight (pop-up) advertisements.
 *
 * NOTE: no change to `advertisements` at all — `placements` is a json column,
 * so the new 'POPUP' value is purely a TypeScript/validation concern.
 *
 * What DOES need DDL:
 *   - ad_settings gains the pop-up product's own controls: a kill switch, its
 *     own (premium) per-day rate, and the two rationing knobs that keep
 *     pop-ups from becoming spam.
 *   - ad_popup_impressions records "this viewer saw this pop-up", which is
 *     what makes both the frequency cap and the fair round-robin real. No FK
 *     on viewerKey: guests (who most need rationing) have no users row.
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class PopupAds1786140000000 implements MigrationInterface {
    name = 'PopupAds1786140000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_settings" ADD COLUMN IF NOT EXISTS "popupEnabled" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "ad_settings" ADD COLUMN IF NOT EXISTS "popupRatePerDay" numeric(10,2) NOT NULL DEFAULT '25'`);
        await queryRunner.query(`ALTER TABLE "ad_settings" ADD COLUMN IF NOT EXISTS "popupMaxPerSession" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "ad_settings" ADD COLUMN IF NOT EXISTS "popupMinMinutesBetween" integer NOT NULL DEFAULT 360`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "ad_popup_impressions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "adId" uuid NOT NULL,
            "viewerKey" character varying(64) NOT NULL,
            "shownAt" TIMESTAMP NOT NULL DEFAULT now(),
            "clickedAt" TIMESTAMP,
            CONSTRAINT "PK_ad_popup_impressions" PRIMARY KEY ("id")
        )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_popup_impressions_viewer" ON "ad_popup_impressions" ("viewerKey", "shownAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_popup_impressions_ad" ON "ad_popup_impressions" ("adId")`);
        // Cascade: an impression is meaningless once its ad is gone, and the
        // boot media sweep deletes ad rows outright.
        await queryRunner.query(`ALTER TABLE "ad_popup_impressions" ADD CONSTRAINT "FK_ad_popup_impressions_ad" FOREIGN KEY ("adId") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ad_popup_impressions" DROP CONSTRAINT IF EXISTS "FK_ad_popup_impressions_ad"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_popup_impressions_ad"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_popup_impressions_viewer"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ad_popup_impressions"`);
        await queryRunner.query(`ALTER TABLE "ad_settings" DROP COLUMN IF EXISTS "popupMinMinutesBetween"`);
        await queryRunner.query(`ALTER TABLE "ad_settings" DROP COLUMN IF EXISTS "popupMaxPerSession"`);
        await queryRunner.query(`ALTER TABLE "ad_settings" DROP COLUMN IF EXISTS "popupRatePerDay"`);
        await queryRunner.query(`ALTER TABLE "ad_settings" DROP COLUMN IF EXISTS "popupEnabled"`);
    }
}
