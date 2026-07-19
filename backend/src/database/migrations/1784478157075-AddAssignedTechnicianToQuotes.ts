import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Technician job assignment: owners assign a paid job (quote) to a
 * TECHNICIAN team member; the technician only ever sees quotes where
 * assignedTechnicianId = their user id.
 *
 * Dev picks this up via DB_SYNCHRONIZE=true; prod applies this migration
 * (DB_RUN_MIGRATIONS=true, synchronize off).
 */
export class AddAssignedTechnicianToQuotes1784478157075 implements MigrationInterface {
    name = 'AddAssignedTechnicianToQuotes1784478157075'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "assignedTechnicianId" uuid`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_quotes_assigned_technician" ON "quotes" ("assignedTechnicianId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_quotes_assigned_technician"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN IF EXISTS "assignedTechnicianId"`);
    }
}
