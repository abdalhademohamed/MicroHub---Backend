import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOrderStatusEnum1782740000000 implements MigrationInterface {
    name = 'FixOrderStatusEnum1782740000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ADD VALUE must be committed before it can be used in the same session.
        // The UPDATE is in the next migration (FixOrderStatusEnumData) which runs in a separate transaction.
        await queryRunner.query(`ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Absent'`);
        await queryRunner.query(`ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Refunded'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not support removing enum values; down is a no-op here.
    }
}
