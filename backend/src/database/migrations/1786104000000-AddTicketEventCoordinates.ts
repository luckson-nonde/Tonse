import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Exact GPS pin for ticketed events: nullable latitude/longitude on
 * ticket_events, captured by the seller at creation. Powers the digital
 * ticket's "open in Google Maps" action so an attendee can navigate to the
 * venue straight off their ticket. numeric(10,7) ≈ centimetre precision.
 *
 * DDL mirrors what DB_SYNCHRONIZE=true creates in dev.
 */
export class AddTicketEventCoordinates1786104000000 implements MigrationInterface {
    name = 'AddTicketEventCoordinates1786104000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD "latitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD "longitude" numeric(10,7)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP COLUMN "latitude"`);
    }
}
