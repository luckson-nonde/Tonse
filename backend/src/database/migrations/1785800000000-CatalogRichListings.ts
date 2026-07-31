import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Rich catalog listings:
 *  - images: simple-array (comma-joined text) → json. Base64 data-URL images
 *    contain a comma (`data:image/jpeg;base64,…`), so the comma-split storage
 *    corrupted any real upload — json arrays round-trip verbatim.
 *  - youtubeUrl: optional promo/demo video per listing (PortfolioItem
 *    precedent; embed helpers live in the frontend portfolioService).
 *  - price: now nullable — a listing without a price is a real
 *    "Price on request" state (drives quote-first flows instead of Buy Now).
 *
 * Dev applies this via DB_SYNCHRONIZE=true; prod via DB_RUN_MIGRATIONS=true.
 */
export class CatalogRichListings1785800000000 implements MigrationInterface {
    name = 'CatalogRichListings1785800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "images" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "images" TYPE json USING to_json(string_to_array("images", ','))`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "images" SET DEFAULT '[]'::json`);
        await queryRunner.query(`ALTER TABLE "products" ADD "youtubeUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" DROP NOT NULL`);
        // Direct-purchase seller alert (enum name verified pattern:
        // AddReportNotificationTypes / AddJobNotificationTypes).
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'ORDER_PAID'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // notifications_type_enum value is irreversible (Postgres can't drop
        // enum values in place) — same accepted stance as the prior
        // notification-type migrations.
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "youtubeUrl"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "images" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "images" TYPE text USING array_to_string(ARRAY(SELECT json_array_elements_text("images")), ',')`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "images" SET DEFAULT ''`);
    }
}
