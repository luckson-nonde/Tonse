import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Technician jobs: two new durable notification types —
 *   JOB_ASSIGNED       → technician alert that the owner assigned them a job
 *   JOB_EVIDENCE_ADDED → buyer alert that after-service evidence was captured
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off). Enum name matches the
 * synchronize-created notifications_type_enum (verified for the report types
 * in 1784436076590-AddReportNotificationTypes.ts).
 */
export class AddJobNotificationTypes1784478157077 implements MigrationInterface {
    name = 'AddJobNotificationTypes1784478157077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'JOB_ASSIGNED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'JOB_EVIDENCE_ADDED'`);
    }

    public async down(): Promise<void> {
        // Postgres cannot drop enum values in place — removing them would
        // require recreating the type and rewriting the column. Accepted as
        // irreversible; rows of the new types are simply never created once
        // the application code is rolled back.
    }
}
