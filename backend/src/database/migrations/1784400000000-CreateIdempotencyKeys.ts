import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Generic Idempotency-Key store (idempotency_keys) backing IdempotencyInterceptor.
 * A request that carries an `Idempotency-Key` header inserts a PENDING row, then
 * flips it to COMPLETED with a response snapshot; a replay under the same key
 * short-circuits to that snapshot. The unique index on `key` is the real
 * guarantee (a concurrent duplicate loses the insert race → 409).
 *
 * Dev auto-creates this via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class CreateIdempotencyKeys1784400000000 implements MigrationInterface {
    name = 'CreateIdempotencyKeys1784400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."idempotency_keys_status_enum" AS ENUM('PENDING', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(255) NOT NULL, "userId" uuid, "method" character varying(10) NOT NULL, "path" character varying(255) NOT NULL, "status" "public"."idempotency_keys_status_enum" NOT NULL DEFAULT 'PENDING', "statusCode" smallint, "responseBody" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_idempotency_keys_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_idempotency_keys_key" ON "idempotency_keys" ("key") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_idempotency_keys_key"`);
        await queryRunner.query(`DROP TABLE "idempotency_keys"`);
        await queryRunner.query(`DROP TYPE "public"."idempotency_keys_status_enum"`);
    }
}
