import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Buyer refunds for cancelled ticketed events: a paid order can now be
 * REFUNDED (its TICKET_SALE journal reversed, its tickets voided), stamped
 * with when the money went back.
 *
 * Same in-transaction ADD VALUE pattern as CreateEventTicketing's
 * ledger_journals_type_enum bump — safe on PG 12+ as long as the new value
 * isn't itself used in this transaction.
 *
 * DDL mirrors what DB_SYNCHRONIZE=true creates in dev.
 */
export class AddTicketOrderRefundStatus1786106000000 implements MigrationInterface {
    name = 'AddTicketOrderRefundStatus1786106000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."ticket_orders_status_enum" ADD VALUE IF NOT EXISTS 'REFUNDED'`);
        await queryRunner.query(`ALTER TABLE "ticket_orders" ADD "refundedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres cannot drop a single enum value — the column is reverted,
        // the (harmless) unused enum label stays.
        await queryRunner.query(`ALTER TABLE "ticket_orders" DROP COLUMN "refundedAt"`);
    }
}
