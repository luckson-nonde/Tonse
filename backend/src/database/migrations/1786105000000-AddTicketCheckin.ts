import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Door check-in for event ticketing:
 *  - tickets gain checkedInAt/checkedInBy, stamped when a QR code is scanned
 *    at the door (status flips VALID → REDEEMED via POST /tickets/scan).
 *  - ticket_event_scanners: the organizer's door team, assigned by email —
 *    any logged-in user whose email matches can scan for that event.
 *
 * DDL mirrors what DB_SYNCHRONIZE=true creates in dev.
 */
export class AddTicketCheckin1786105000000 implements MigrationInterface {
    name = 'AddTicketCheckin1786105000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" ADD "checkedInAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "checkedInBy" uuid`);

        await queryRunner.query(`CREATE TABLE "ticket_event_scanners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "email" character varying(160) NOT NULL, "name" character varying(120), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ticket_event_scanners_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ticket_scanners_event" ON "ticket_event_scanners" ("eventId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_ticket_scanners_event_email" ON "ticket_event_scanners" ("eventId", "email")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_ticket_scanners_event_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ticket_scanners_event"`);
        await queryRunner.query(`DROP TABLE "ticket_event_scanners"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "checkedInBy"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "checkedInAt"`);
    }
}
