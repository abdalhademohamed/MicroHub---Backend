import { MigrationInterface, QueryRunner } from "typeorm";

export class EnsureAllSoftDeleteColumns1782720000000 implements MigrationInterface {
    name = 'EnsureAllSoftDeleteColumns1782720000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // branch_entity soft-delete + audit columns
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "created_by" character varying`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "updated_by" character varying`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "deleted_by" character varying`);

        // employee_entity soft-delete columns (deleted_at was missing from all previous migrations)
        await queryRunner.query(`ALTER TABLE "employee_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "employee_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);

        // service_entity soft-delete columns
        await queryRunner.query(`ALTER TABLE "service_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "service_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_entity" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "service_entity" DROP COLUMN IF EXISTS "isactive"`);
        await queryRunner.query(`ALTER TABLE "employee_entity" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "employee_entity" DROP COLUMN IF EXISTS "isactive"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "deleted_by"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "updated_by"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "created_by"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "isactive"`);
    }
}
