import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One-time backfill of `products.salesCount` from sales that already happened.
 *
 * `orders.items` is the only place a completed purchase records WHICH listing
 * was bought — DirectOrderService writes `[{productId, title, quantity,
 * unitPrice}]` there. Without this pass every historical sale would read as
 * zero and the storefront would rank a brand-new listing above one that has
 * been selling for months.
 *
 * The guards are not paranoia. `orders.items` is `json` (not `jsonb`) and is
 * freeform: the generic `POST /orders` accepts `Record<string, any>[]` from any
 * authenticated user, so a row can hold an object instead of an array, a
 * `productId` that isn't a uuid, or a non-numeric quantity. `json_array_elements`
 * throws outright on a non-array, and one bad uuid string aborts the cast for
 * every row — hence the array check resolved in its OWN CTE before the unnest,
 * and regex guards before each cast.
 *
 * This is not the "JS-filter json arrays, never SQL containment" invariant
 * being broken: that rule is about repeated request-time filtering on an
 * unindexed json column. This is a one-time offline unnest, the same thing
 * CatalogRichListings already does with json_array_elements_text.
 *
 * Before running against production, sanity-check the aggregate alone:
 *   SELECT COUNT(*) FROM inquiries WHERE attributes->>'orderKind' = 'DIRECT_PURCHASE';
 * every direct purchase creates exactly one such inquiry, so a large mismatch
 * would mean historical rows arrived via the generic endpoint instead.
 */
export class BackfillProductSalesCount1786101000000 implements MigrationInterface {
    name = 'BackfillProductSalesCount1786101000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            WITH valid_orders AS (
                -- Guard 1: only rows whose items is genuinely a json ARRAY.
                -- Must resolve before json_array_elements runs below.
                SELECT o.items
                  FROM "orders" o
                  JOIN "quotes" q ON q.id = o."quoteId"
                 WHERE o.items IS NOT NULL
                   AND json_typeof(o.items) = 'array'
                   -- Mirror what the live increment counts: a direct-buy quote
                   -- is born PAID, so "not reversed" is the right filter rather
                   -- than "completed only", which would under-count.
                   AND q.status NOT IN ('CANCELLED', 'REFUNDED')
            ),
            order_items AS (
                SELECT json_array_elements(items) AS elem FROM valid_orders
            ),
            valid_items AS (
                -- Guards 2 and 3: shape-check before casting.
                SELECT
                    (elem->>'productId')::uuid AS product_id,
                    (elem->>'quantity')::int   AS quantity
                  FROM order_items
                 WHERE (elem->>'productId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                   AND (elem->>'quantity') ~ '^[0-9]+$'
            ),
            agg AS (
                SELECT product_id, SUM(quantity)::int AS total_qty
                  FROM valid_items
                 GROUP BY product_id
            )
            UPDATE "products" p
               SET "salesCount" = agg.total_qty
              FROM agg
             -- Guard 4: the join drops any uuid-shaped id with no product row.
             WHERE p.id = agg.product_id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Lossy by nature — the counter is derived, so reverting means zeroing
        // it and letting a re-run rebuild it. Same convention as the other
        // backfilling migrations in this folder.
        await queryRunner.query(`UPDATE "products" SET "salesCount" = 0`);
    }
}
