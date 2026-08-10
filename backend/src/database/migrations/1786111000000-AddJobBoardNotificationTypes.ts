import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Job board: six new durable notification types —
 *   JOB_APPROVED / JOB_REJECTED   → poster: admin verdict on their posting
 *   NEW_JOB_MATCH                 → seeker: an approved posting matches their
 *                                   registered labour trades
 *   NEW_JOB_APPLICATION           → poster: a seeker applied
 *   APPLICATION_ACCEPTED/REJECTED → seeker: the poster's verdict
 *
 * (Unrelated to the technician JOB_ASSIGNED/JOB_EVIDENCE_ADDED pair.)
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class AddJobBoardNotificationTypes1786111000000 implements MigrationInterface {
    name = 'AddJobBoardNotificationTypes1786111000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'JOB_APPROVED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'JOB_REJECTED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'NEW_JOB_MATCH'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'NEW_JOB_APPLICATION'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'APPLICATION_ACCEPTED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'APPLICATION_REJECTED'`);
    }

    public async down(): Promise<void> {
        // Postgres cannot drop enum values in place — removing them would
        // require recreating the type and rewriting the column. Accepted as
        // irreversible; rows of the new types are simply never created once
        // the application code is rolled back.
    }
}
