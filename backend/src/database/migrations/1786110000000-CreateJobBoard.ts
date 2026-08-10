import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Labour job board: job_postings (moderated, PENDING_APPROVAL →
 * APPROVED/REJECTED by an admin, then FILLED/CLOSED by the poster),
 * job_posting_categories (posting ↔ labour-trade junction that seeker-feed
 * matching equality-joins against service_provider_profile_categories), and
 * job_applications (applicant-shaped responses with a unique
 * (jobPostingId, applicantUserId) double-apply guard).
 *
 * DDL (column shapes, enum names, index/PK/FK names) mirrors exactly what
 * DB_SYNCHRONIZE=true creates in dev, so the two paths cannot drift. Prod
 * applies this migration (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class CreateJobBoard1786110000000 implements MigrationInterface {
    name = 'CreateJobBoard1786110000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."job_postings_status_enum" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FILLED', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "job_postings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "posterId" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "workersNeeded" integer, "payOffer" numeric(10,2), "payRateUnit" character varying(20), "applicationDeadline" TIMESTAMP, "location" character varying(255), "province" character varying(100), "city" character varying(100), "attributes" json, "status" "public"."job_postings_status_enum" NOT NULL DEFAULT 'PENDING_APPROVAL', "rejectionReason" text, "approvedByAdminId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dda635ece382c8ad2d90a179182" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_job_postings_created" ON "job_postings" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "idx_job_postings_status" ON "job_postings" ("status")`);
        await queryRunner.query(`CREATE INDEX "idx_job_postings_poster" ON "job_postings" ("posterId")`);
        await queryRunner.query(`CREATE TABLE "job_posting_categories" ("jobPostingId" uuid NOT NULL, "categoryId" character varying(64) NOT NULL, CONSTRAINT "PK_efc8e7f919800d1033160ca17f4" PRIMARY KEY ("jobPostingId", "categoryId"))`);
        await queryRunner.query(`CREATE INDEX "idx_job_posting_categories_category" ON "job_posting_categories" ("categoryId")`);
        await queryRunner.query(`CREATE TYPE "public"."job_applications_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "job_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jobPostingId" uuid NOT NULL, "applicantUserId" uuid NOT NULL, "coverMessage" text NOT NULL, "expectedRate" numeric(10,2) NOT NULL, "rateUnit" character varying(20) NOT NULL, "availabilityDate" date NOT NULL, "status" "public"."job_applications_status_enum" NOT NULL DEFAULT 'PENDING', "respondedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c56a5e86707d0f0df18fa111280" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_job_applications_unique" ON "job_applications" ("jobPostingId", "applicantUserId")`);
        await queryRunner.query(`CREATE INDEX "idx_job_applications_applicant" ON "job_applications" ("applicantUserId")`);
        await queryRunner.query(`CREATE INDEX "idx_job_applications_posting" ON "job_applications" ("jobPostingId")`);
        await queryRunner.query(`ALTER TABLE "job_posting_categories" ADD CONSTRAINT "FK_d83ff31ed3959831921dd5d6500" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_posting_categories" ADD CONSTRAINT "FK_e047f24bf344e5aa53545982aa3" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD CONSTRAINT "FK_ec9063a093d5b9e2d57d98ccfbb" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_applications" DROP CONSTRAINT "FK_ec9063a093d5b9e2d57d98ccfbb"`);
        await queryRunner.query(`ALTER TABLE "job_posting_categories" DROP CONSTRAINT "FK_e047f24bf344e5aa53545982aa3"`);
        await queryRunner.query(`ALTER TABLE "job_posting_categories" DROP CONSTRAINT "FK_d83ff31ed3959831921dd5d6500"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_applications_posting"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_applications_applicant"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_applications_unique"`);
        await queryRunner.query(`DROP TABLE "job_applications"`);
        await queryRunner.query(`DROP TYPE "public"."job_applications_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_posting_categories_category"`);
        await queryRunner.query(`DROP TABLE "job_posting_categories"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_postings_poster"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_postings_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_postings_created"`);
        await queryRunner.query(`DROP TABLE "job_postings"`);
        await queryRunner.query(`DROP TYPE "public"."job_postings_status_enum"`);
    }
}
