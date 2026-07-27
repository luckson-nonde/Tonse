import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Home Care (clinical-services/home-care) care plans: one row per
 * caregiver↔client engagement, created from an accepted/paid quote. Needs,
 * tasks and visits live as JSON on the row (a caregiver has a handful of
 * clients — the whole plan loads and saves as one unit). Loose uuid columns,
 * no FK relations (shop_favorites convention). Unique index on quoteId makes
 * create-from-quote idempotent; Postgres treats NULLs as distinct so plans
 * without a source quote stay legal.
 *
 * Dev auto-creates this via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class CreateCarePlans1785024000000 implements MigrationInterface {
    name = 'CreateCarePlans1785024000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "care_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "buyerId" uuid NOT NULL, "quoteId" uuid, "clientName" character varying(255) NOT NULL, "careNeeds" json, "tasks" json, "visits" json, "paymentModel" character varying(20) NOT NULL DEFAULT 'PER_VISIT', "rate" numeric(12,2), "paymentMethod" character varying(50), "paidUntil" TIMESTAMP, "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_care_plans_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_care_plans_provider" ON "care_plans" ("providerId") `);
        await queryRunner.query(`CREATE INDEX "idx_care_plans_buyer" ON "care_plans" ("buyerId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_care_plans_quote_unique" ON "care_plans" ("quoteId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_care_plans_quote_unique"`);
        await queryRunner.query(`DROP INDEX "public"."idx_care_plans_buyer"`);
        await queryRunner.query(`DROP INDEX "public"."idx_care_plans_provider"`);
        await queryRunner.query(`DROP TABLE "care_plans"`);
    }
}
