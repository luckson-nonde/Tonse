import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Browse Shops → Favorites: a per-(user, shop) table of the shops a buyer has
 * favorited. Loose uuid columns, no FK relations (same convention as
 * shop_reviews). The unique (userId, shopId) index makes favoriting idempotent.
 *
 * Dev auto-creates this via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class CreateShopFavorites1784300000000 implements MigrationInterface {
    name = 'CreateShopFavorites1784300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "shop_favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "shopId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_shop_favorites_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_shop_favorites_user" ON "shop_favorites" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_shop_favorites_user_shop_unique" ON "shop_favorites" ("userId", "shopId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_shop_favorites_user_shop_unique"`);
        await queryRunner.query(`DROP INDEX "public"."idx_shop_favorites_user"`);
        await queryRunner.query(`DROP TABLE "shop_favorites"`);
    }
}
