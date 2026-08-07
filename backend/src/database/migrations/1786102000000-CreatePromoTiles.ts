import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * `promo_tiles` — admin-authored merchandising slots on the public landing page.
 *
 * These carry the storefront grid before the platform has sold anything. Once
 * real direct purchases land, best-selling products claim the slots
 * automatically and tiles fill the remainder (StorefrontService.getHome).
 *
 * Only `targetProductId` gets a foreign key, with ON DELETE SET NULL: sellers
 * can hard-delete their own listings at any time with no idea an admin tile
 * points at one. CASCADE would silently destroy the admin's tile; RESTRICT
 * would block the seller over an object they can't see. SET NULL scrubs the
 * pointer and the tile falls through to its shop/category target.
 *
 * `targetShopProfileId` has no FK because the two profile tables
 * (seller_profiles / service_provider_profiles) have no common parent to
 * reference, and `targetCategoryId` has none because category ids are catalog
 * slugs — both matching the same decisions on `advertisements`.
 */
export class CreatePromoTiles1786102000000 implements MigrationInterface {
    name = 'CreatePromoTiles1786102000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "promo_tiles" (
                "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title"               character varying(160) NOT NULL,
                "subtitle"            character varying(200),
                "imageUrl"            character varying(500) NOT NULL,
                "ctaLabel"            character varying(40),
                "targetProductId"     uuid,
                "targetShopProfileId" uuid,
                "targetCategoryId"    character varying(100),
                "backgroundColor"     character varying(20),
                "sortOrder"           integer NOT NULL DEFAULT 0,
                "isActive"            boolean NOT NULL DEFAULT true,
                "createdAt"           TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"           TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_promo_tiles_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_promo_tiles_active_sort"
                ON "promo_tiles" ("isActive", "sortOrder")
        `);
        await queryRunner.query(`
            ALTER TABLE "promo_tiles"
              ADD CONSTRAINT "FK_promo_tiles_target_product"
              FOREIGN KEY ("targetProductId") REFERENCES "products"("id")
              ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_tiles" DROP CONSTRAINT IF EXISTS "FK_promo_tiles_target_product"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_promo_tiles_active_sort"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "promo_tiles"`);
    }
}
