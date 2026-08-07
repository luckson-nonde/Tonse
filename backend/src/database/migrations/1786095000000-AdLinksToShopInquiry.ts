import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ads stop carrying a hand-typed URL and instead point at the seller's own
 * shop quote form, so every click becomes a real inquiry attributed to the ad.
 *
 * `targetUrl` (free text a seller had to type, and could typo into a dead
 * link) is replaced by `shopProfileId` — the `seller_profiles.id` /
 * `service_provider_profiles.id` that `/discover/:id` resolves. It's
 * backfilled for existing ads by looking the seller's profile up, so ads
 * already sold keep working rather than pointing nowhere.
 */
export class AdLinksToShopInquiry1786095000000 implements MigrationInterface {
    name = 'AdLinksToShopInquiry1786095000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertisements" ADD COLUMN IF NOT EXISTS "shopProfileId" uuid`);
        await queryRunner.query(`
            UPDATE "advertisements" a
               SET "shopProfileId" = COALESCE(
                     (SELECT sp.id FROM seller_profiles sp WHERE sp."userId" = a."sellerId" LIMIT 1),
                     (SELECT pp.id FROM service_provider_profiles pp WHERE pp."userId" = a."sellerId" LIMIT 1)
                   )
        `);
        await queryRunner.query(`ALTER TABLE "advertisements" DROP COLUMN IF EXISTS "targetUrl"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advertisements" ADD COLUMN IF NOT EXISTS "targetUrl" character varying(500)`);
        // Best-effort reconstruction — the original free-text URL is gone, but
        // the shop link it was replaced by is expressible.
        await queryRunner.query(`UPDATE "advertisements" SET "targetUrl" = '/discover/' || COALESCE("shopProfileId"::text, '')`);
        await queryRunner.query(`ALTER TABLE "advertisements" ALTER COLUMN "targetUrl" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "advertisements" DROP COLUMN IF EXISTS "shopProfileId"`);
    }
}
