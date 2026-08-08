import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Event ticketing: sellers in the events category create ticketed events
 * (ticket_events + ticket_tiers), guests buy through the public share link
 * (ticket_orders → tickets, one row per admitted unit), and each paid order
 * posts a TICKET_SALE journal (Dr PSP_HOLDING gross / Cr SELLER_PAYABLE net /
 * Cr PLATFORM_COMMISSION_REVENUE). The event_ticket_settings singleton holds
 * the admin-set commission percent. Accounts already exist in the chart —
 * only the journal type is new.
 *
 * DDL mirrors exactly what DB_SYNCHRONIZE=true creates in dev, so the two
 * paths cannot drift. Prod applies this migration (DB_RUN_MIGRATIONS=true,
 * synchronize off).
 */
export class CreateEventTicketing1786103000000 implements MigrationInterface {
    name = 'CreateEventTicketing1786103000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ticket_events_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "ticket_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sellerId" uuid NOT NULL, "code" character varying(20) NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "venue" character varying(500) NOT NULL, "eventDate" TIMESTAMP NOT NULL, "posterUrl" character varying(500), "status" "public"."ticket_events_status_enum" NOT NULL DEFAULT 'PUBLISHED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ticket_events_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ticket_events_seller" ON "ticket_events" ("sellerId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_ticket_events_code" ON "ticket_events" ("code")`);

        await queryRunner.query(`CREATE TABLE "ticket_tiers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "name" character varying(120) NOT NULL, "priceZmw" numeric(10,2) NOT NULL, "totalQuantity" integer NOT NULL, "remainingQuantity" integer NOT NULL, CONSTRAINT "PK_ticket_tiers_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ticket_tiers_event" ON "ticket_tiers" ("eventId")`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD CONSTRAINT "FK_ticket_tiers_event" FOREIGN KEY ("eventId") REFERENCES "ticket_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TYPE "public"."ticket_orders_status_enum" AS ENUM('PENDING', 'PAID', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "ticket_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "reference" character varying(40) NOT NULL, "buyerName" character varying(120) NOT NULL, "buyerPhone" character varying(40), "buyerEmail" character varying(160), "lineItems" json NOT NULL, "totalAmountZmw" numeric(10,2) NOT NULL, "commissionZmw" numeric(10,2), "status" "public"."ticket_orders_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ticket_orders_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ticket_orders_event" ON "ticket_orders" ("eventId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_ticket_orders_reference" ON "ticket_orders" ("reference")`);

        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('VALID', 'REDEEMED', 'VOID')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "eventId" uuid NOT NULL, "tierId" uuid NOT NULL, "code" character varying(20) NOT NULL, "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'VALID', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_tickets_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_tickets_order" ON "tickets" ("orderId")`);
        await queryRunner.query(`CREATE INDEX "idx_tickets_event" ON "tickets" ("eventId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_tickets_code" ON "tickets" ("code")`);

        await queryRunner.query(`CREATE TABLE "event_ticket_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "commissionPercent" numeric(5,2) NOT NULL DEFAULT '5', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_event_ticket_settings_id" PRIMARY KEY ("id"))`);

        // Same in-transaction ADD VALUE pattern as CreateAdvertisements
        // (safe on PG 12+ as long as the value isn't used in this transaction).
        await queryRunner.query(`ALTER TYPE "public"."ledger_journals_type_enum" ADD VALUE IF NOT EXISTS 'TICKET_SALE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "event_ticket_settings"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tickets_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tickets_event"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tickets_order"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ticket_orders_reference"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ticket_orders_event"`);
        await queryRunner.query(`DROP TABLE "ticket_orders"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP CONSTRAINT "FK_ticket_tiers_event"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ticket_tiers_event"`);
        await queryRunner.query(`DROP TABLE "ticket_tiers"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ticket_events_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ticket_events_seller"`);
        await queryRunner.query(`DROP TABLE "ticket_events"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_events_status_enum"`);
        // TICKET_SALE stays in ledger_journals_type_enum — Postgres cannot drop
        // enum values in place (same accepted irreversibility as ads).
    }
}
