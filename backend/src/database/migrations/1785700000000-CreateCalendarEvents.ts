import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Personal calendar entries behind the dashboard calendar/timeline and the
 * /schedule page (generic scheduling module — any authenticated role). One
 * row per user-created event; userId is a loose uuid column with no FK
 * relation (care_plans convention). category/repeatRule/status are varchar
 * unions, not Postgres enums, so future values never need ALTER TYPE.
 * Recurrence stores the rule only — occurrences are expanded client-side.
 *
 * Dev auto-creates this via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class CreateCalendarEvents1785700000000 implements MigrationInterface {
    name = 'CreateCalendarEvents1785700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "calendar_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text, "date" date NOT NULL, "startTime" TIME, "endTime" TIME, "location" character varying(255), "category" character varying(30) NOT NULL DEFAULT 'OTHER', "color" character varying(20), "repeatRule" character varying(10) NOT NULL DEFAULT 'NONE', "reminderOffsetMinutes" integer, "status" character varying(20) NOT NULL DEFAULT 'CONFIRMED', "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_calendar_events_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_calendar_events_user" ON "calendar_events" ("userId") `);
        await queryRunner.query(`CREATE INDEX "idx_calendar_events_date" ON "calendar_events" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_calendar_events_date"`);
        await queryRunner.query(`DROP INDEX "public"."idx_calendar_events_user"`);
        await queryRunner.query(`DROP TABLE "calendar_events"`);
    }
}
