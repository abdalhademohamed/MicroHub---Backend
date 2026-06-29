import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColorCodeToOrder1782760000000 implements MigrationInterface {
  name = 'AddColorCodeToOrder1782760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_entity" ADD COLUMN IF NOT EXISTS "colorCode" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_entity" DROP COLUMN IF EXISTS "colorCode"`,
    );
  }
}
