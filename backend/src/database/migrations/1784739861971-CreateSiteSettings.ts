import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Platform-wide site_settings singleton (get-or-create), same shape as
 * BillingSettings. landingPageEnabled gates the public /discover shop
 * directory — defaults false so a fresh deploy never changes today's
 * straight-to-login behaviour until an admin opts in.
 *
 * Dev auto-creates this via DB_SYNCHRONIZE=true; prod applies this
 * migration (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class CreateSiteSettings1784739861971 implements MigrationInterface {
    name = 'CreateSiteSettings1784739861971'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "site_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "landingPageEnabled" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_site_settings_id" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "site_settings"`);
    }
}
