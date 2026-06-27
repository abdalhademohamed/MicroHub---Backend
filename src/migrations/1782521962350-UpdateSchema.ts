import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSchema1782521962350 implements MigrationInterface {
    name = 'UpdateSchema1782521962350'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_entity" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "service_entity" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "service_entity" ADD "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "branch_entity" ADD "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "review_entity" ALTER COLUMN "createdAt" SET DEFAULT '"2026-06-27T00:59:25.527Z"'`);
        await queryRunner.query(`ALTER TABLE "payment_entity" ALTER COLUMN "createdAt" SET DEFAULT '"2026-06-27T00:59:25.577Z"'`);
        await queryRunner.query(`ALTER TYPE "public"."order_entity_status_enum" RENAME TO "order_entity_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."order_entity_status_enum" AS ENUM('Pending', 'InQueue', 'Working', 'Reviewed', 'Completed', 'Canceled', 'Absent', 'Refunded')`);
        await queryRunner.query(`ALTER TABLE "order_entity" ALTER COLUMN "status" TYPE "public"."order_entity_status_enum" USING "status"::"text"::"public"."order_entity_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."order_entity_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "reservation_entity" ALTER COLUMN "createdAt" SET DEFAULT '"2026-06-27T00:59:25.613Z"'`);
        await queryRunner.query(`ALTER TABLE "file_entity" ALTER COLUMN "createdAt" SET DEFAULT '"2026-06-27T00:59:25.722Z"'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_entity" ALTER COLUMN "createdAt" SET DEFAULT '2026-06-27 00:18:16.841'`);
        await queryRunner.query(`ALTER TABLE "reservation_entity" ALTER COLUMN "createdAt" SET DEFAULT '2026-06-27 00:18:16.125'`);
        await queryRunner.query(`CREATE TYPE "public"."order_entity_status_enum_old" AS ENUM('Pending', 'InQueue', 'Working', 'Reviewed', 'Completed', 'Canceled', 'Abscent', 'Refuneded')`);
        await queryRunner.query(`ALTER TABLE "order_entity" ALTER COLUMN "status" TYPE "public"."order_entity_status_enum_old" USING "status"::"text"::"public"."order_entity_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."order_entity_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."order_entity_status_enum_old" RENAME TO "order_entity_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payment_entity" ALTER COLUMN "createdAt" SET DEFAULT '2026-06-27 00:18:16.119'`);
        await queryRunner.query(`ALTER TABLE "review_entity" ALTER COLUMN "createdAt" SET DEFAULT '2026-06-27 00:18:16.116'`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "branch_entity" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "service_entity" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "service_entity" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "employee_entity" DROP COLUMN "isActive"`);
    }

}
