import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Job-board applications carry evidence: [{ label, url }] where each entry
 * answers one requirement the poster specified (trade certificate, licence,
 * permit). URLs are `/files/secure/...` — encrypted at rest, auth-gated —
 * never public /uploads paths.
 *
 * DDL mirrors what DB_SYNCHRONIZE=true creates in dev, so the two paths
 * cannot drift. Prod applies this migration (DB_RUN_MIGRATIONS=true).
 */
export class AddJobApplicationAttachments1786112000000 implements MigrationInterface {
    name = 'AddJobApplicationAttachments1786112000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "attachments" json`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "attachments"`);
    }
}
