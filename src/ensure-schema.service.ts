import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EnsureSchemaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EnsureSchemaService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureColumns();
      await this.ensureEnumValues();
      await this.fixEnumData();
      this.logger.log('Schema verified successfully');
    } catch (err) {
      this.logger.error('Schema verification failed', err);
    }
  }

  private async ensureColumns() {
    const stmts = [
      // branch_entity
      `ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`,
      `ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
      `ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "created_by" character varying`,
      `ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "updated_by" character varying`,
      `ALTER TABLE "branch_entity" ADD COLUMN IF NOT EXISTS "deleted_by" character varying`,
      // employee_entity
      `ALTER TABLE "employee_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`,
      `ALTER TABLE "employee_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
      // service_entity
      `ALTER TABLE "service_entity" ADD COLUMN IF NOT EXISTS "isactive" boolean NOT NULL DEFAULT true`,
      `ALTER TABLE "service_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
      // reservation_entity
      `ALTER TABLE "reservation_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
      // customer_entity
      `ALTER TABLE "customer_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    ];

    // offer_entity: rename isActive → isactive, or add if neither exists
    const offerFix = `
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='offer_entity' AND column_name='isActive'
        ) THEN
          ALTER TABLE "offer_entity" RENAME COLUMN "isActive" TO "isactive";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='offer_entity' AND column_name='isactive'
        ) THEN
          ALTER TABLE "offer_entity" ADD COLUMN "isactive" boolean NOT NULL DEFAULT true;
        END IF;
      END $$;`;

    // sharable_offer_entity: same
    const sharableFix = `
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='sharable_offer_entity' AND column_name='isActive'
        ) THEN
          ALTER TABLE "sharable_offer_entity" RENAME COLUMN "isActive" TO "isactive";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='sharable_offer_entity' AND column_name='isactive'
        ) THEN
          ALTER TABLE "sharable_offer_entity" ADD COLUMN "isactive" boolean NOT NULL DEFAULT true;
        END IF;
      END $$;`;

    for (const sql of stmts) {
      await this.ds.query(sql);
    }
    await this.ds.query(offerFix);
    await this.ds.query(sharableFix);
  }

  private async ensureEnumValues() {
    await this.ds.query(`ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Absent'`);
    await this.ds.query(`ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Refunded'`);
  }

  private async fixEnumData() {
    await this.ds.query(`UPDATE "order_entity" SET "status"='Absent'  WHERE "status"='Abscent'`);
    await this.ds.query(`UPDATE "order_entity" SET "status"='Refunded' WHERE "status"='Refuneded'`);
  }
}
