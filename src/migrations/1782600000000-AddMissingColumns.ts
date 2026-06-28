import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingColumns1782600000000 implements MigrationInterface {
    name = 'AddMissingColumns1782600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "service_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "service_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "created_by" character varying`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "updated_by" character varying`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "deleted_by" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "deleted_by"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "updated_by"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "created_by"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN IF EXISTS "isactive"`);
        await queryRunner.query(`ALTER TABLE "service_entity" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "service_entity" DROP COLUMN IF EXISTS "isactive"`);
        await queryRunner.query(`ALTER TABLE "employee_entity" DROP COLUMN IF EXISTS "isactive"`);
    }
}
