import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * job_media — before/after service evidence (photos + short video) captured
 * by the assigned technician (or the owner) on a job (= a quote). Mirrors
 * backend/src/modules/jobs/entities/job-media.entity.ts.
 *
 * Enum type names follow TypeORM's synchronize convention
 * (<table>_<column>_enum) so a dev DB created via DB_SYNCHRONIZE=true and a
 * prod DB created via this migration end up identical.
 */
export class CreateJobMediaTable1784478157076 implements MigrationInterface {
    name = 'CreateJobMediaTable1784478157076'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."job_media_phase_enum" AS ENUM('BEFORE', 'AFTER')`);
        await queryRunner.query(`CREATE TYPE "public"."job_media_mediatype_enum" AS ENUM('IMAGE', 'VIDEO')`);
        await queryRunner.query(`CREATE TABLE "job_media" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "quoteId" uuid NOT NULL,
            "capturedById" uuid NOT NULL,
            "phase" "public"."job_media_phase_enum" NOT NULL,
            "mediaType" "public"."job_media_mediatype_enum" NOT NULL,
            "url" character varying(500) NOT NULL,
            "note" text,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_job_media_id" PRIMARY KEY ("id")
        )`);
        await queryRunner.query(`CREATE INDEX "idx_job_media_quote_id" ON "job_media" ("quoteId")`);
        await queryRunner.query(`ALTER TABLE "job_media" ADD CONSTRAINT "FK_job_media_quote" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_media" ADD CONSTRAINT "FK_job_media_captured_by" FOREIGN KEY ("capturedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_media" DROP CONSTRAINT "FK_job_media_captured_by"`);
        await queryRunner.query(`ALTER TABLE "job_media" DROP CONSTRAINT "FK_job_media_quote"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_media_quote_id"`);
        await queryRunner.query(`DROP TABLE "job_media"`);
        await queryRunner.query(`DROP TYPE "public"."job_media_mediatype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."job_media_phase_enum"`);
    }
}
