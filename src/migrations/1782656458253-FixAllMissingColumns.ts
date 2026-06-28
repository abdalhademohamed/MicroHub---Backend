import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAllMissingColumns1782656458253 implements MigrationInterface {
    name = 'FixAllMissingColumns1782656458253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix case mismatch: rename "isActive" → "isactive" to match entity definitions
        await queryRunner.query(`ALTER TABLE "sharable_offer_entity" RENAME COLUMN "isActive" TO "isactive"`);
        await queryRunner.query(`ALTER TABLE "offer_entity" RENAME COLUMN "isActive" TO "isactive"`);

        // Add missing deleted_at column to reservation_entity
        await queryRunner.query(`ALTER TABLE "reservation_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);

        // Fix typos in order status enum (Abscent→Absent, Refuneded→Refunded)
        await queryRunner.query(`ALTER TYPE "public"."order_entity_status_enum" RENAME TO "order_entity_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."order_entity_status_enum" AS ENUM('Pending', 'InQueue', 'Working', 'Reviewed', 'Completed', 'Canceled', 'Absent', 'Refunded')`);
        await queryRunner.query(`ALTER TABLE "order_entity" ALTER COLUMN "status" TYPE "public"."order_entity_status_enum" USING "status"::"text"::"public"."order_entity_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."order_entity_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."order_entity_status_enum_old" AS ENUM('Pending', 'InQueue', 'Working', 'Reviewed', 'Completed', 'Canceled', 'Abscent', 'Refuneded')`);
        await queryRunner.query(`ALTER TABLE "order_entity" ALTER COLUMN "status" TYPE "public"."order_entity_status_enum_old" USING "status"::"text"::"public"."order_entity_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."order_entity_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."order_entity_status_enum_old" RENAME TO "order_entity_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reservation_entity" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "offer_entity" RENAME COLUMN "isactive" TO "isActive"`);
        await queryRunner.query(`ALTER TABLE "sharable_offer_entity" RENAME COLUMN "isactive" TO "isActive"`);
    }
}
