import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFields1688000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee" ADD COLUMN "isActive" boolean DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "branch" ADD COLUMN "deleted_at" timestamp`);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "branch" DROP COLUMN "deleted_at"`);
    }
}