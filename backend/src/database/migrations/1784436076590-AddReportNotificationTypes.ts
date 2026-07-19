import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Transaction reporting: two new durable notification types —
 *   REPORT_FILED    → reporter confirmation that their complaint was filed
 *   REPORT_RECEIVED → admin alert (primary + ADMIN_REPORTS managers)
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off). Enum name verified against a
 * live synchronize-created DB: notifications_type_enum.
 */
export class AddReportNotificationTypes1784436076590 implements MigrationInterface {
    name = 'AddReportNotificationTypes1784436076590'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'REPORT_FILED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'REPORT_RECEIVED'`);
    }

    public async down(): Promise<void> {
        // Postgres cannot drop enum values in place — removing them would
        // require recreating the type and rewriting the column. Accepted as
        // irreversible; rows of the new types are simply never created once
        // the application code is rolled back.
    }
}
