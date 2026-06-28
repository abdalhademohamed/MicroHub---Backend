import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOrderStatusEnumData1782741000000 implements MigrationInterface {
    name = 'FixOrderStatusEnumData1782741000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Runs in a separate transaction AFTER FixOrderStatusEnum committed the new enum values.
        // Now we can safely use 'Absent' and 'Refunded' in queries.
        await queryRunner.query(`UPDATE "order_entity" SET "status" = 'Absent'   WHERE "status" = 'Abscent'`);
        await queryRunner.query(`UPDATE "order_entity" SET "status" = 'Refunded' WHERE "status" = 'Refuneded'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "order_entity" SET "status" = 'Refuneded' WHERE "status" = 'Refunded'`);
        await queryRunner.query(`UPDATE "order_entity" SET "status" = 'Abscent'   WHERE "status" = 'Absent'`);
    }
}
