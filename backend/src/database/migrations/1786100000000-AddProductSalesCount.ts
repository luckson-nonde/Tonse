import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * `products.salesCount` — units moved through direct purchase.
 *
 * The landing-page storefront ranks listings by what actually sells, and no
 * existing column can express that: the inquiry → quote → order flow never
 * references a product row at all, so only `POST /products/:id/buy` produces
 * an attributable sale. DirectOrderService bumps this inside the transaction
 * that already locks the row for the stock decrement.
 *
 * The index is partial on purpose. The only query that reads this column is
 * `WHERE "isActive" AND "salesCount" > 0 ORDER BY "salesCount" DESC LIMIT 8`,
 * so indexing only the rows that can ever match keeps it tiny — most listings
 * have never sold.
 */
export class AddProductSalesCount1786100000000 implements MigrationInterface {
    name = 'AddProductSalesCount1786100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "salesCount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_products_sales_count_active"
                ON "products" ("salesCount" DESC)
             WHERE "isActive" = true AND "salesCount" > 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_sales_count_active"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "salesCount"`);
    }
}
