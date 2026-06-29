import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EnsureSchemaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EnsureSchemaService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    this.logger.log('EnsureSchemaService starting...');
    await this.ensureColumns();
    await this.ensureEnumValues();
    await this.fixEnumData();
    this.logger.log('EnsureSchemaService done.');
  }

  private async runSafe(label: string, sql: string) {
    try {
      await this.ds.query(sql);
      this.logger.log(`OK: ${label}`);
    } catch (err: any) {
      this.logger.warn(`SKIP (${label}): ${err?.message}`);
    }
  }

  private async ensureColumns() {
    const cols: [string, string][] = [
      ['branch isactive',    `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "isactive"   boolean   NOT NULL DEFAULT true`],
      ['branch deleted_at',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`],
      ['branch created_by',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "created_by" character varying`],
      ['branch updated_by',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "updated_by" character varying`],
      ['branch deleted_by',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "deleted_by" character varying`],
      ['employee isactive',  `ALTER TABLE "employee_entity"    ADD COLUMN IF NOT EXISTS "isactive"   boolean   NOT NULL DEFAULT true`],
      ['employee deleted_at',`ALTER TABLE "employee_entity"    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`],
      ['service isactive',   `ALTER TABLE "service_entity"     ADD COLUMN IF NOT EXISTS "isactive"   boolean   NOT NULL DEFAULT true`],
      ['service deleted_at', `ALTER TABLE "service_entity"     ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`],
      ['reservation del_at', `ALTER TABLE "reservation_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`],
      ['customer deleted_at',`ALTER TABLE "customer_entity"    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`],
      ['order colorCode',    `ALTER TABLE "order_entity"       ADD COLUMN IF NOT EXISTS "colorCode" character varying`],
    ];

    for (const [label, sql] of cols) {
      await this.runSafe(label, sql);
    }

    // offer_entity: rename isActive → isactive, or add if neither exists
    await this.runSafe('offer isactive fix', `
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
      END $$`);

    // sharable_offer_entity: same
    await this.runSafe('sharable_offer isactive fix', `
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
      END $$`);
  }

  private async ensureEnumValues() {
    await this.runSafe(
      'enum Absent',
      `ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Absent'`,
    );
    await this.runSafe(
      'enum Refunded',
      `ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Refunded'`,
    );
  }

  private async fixEnumData() {
    await this.runSafe(
      'fix Abscent→Absent',
      `UPDATE "order_entity" SET "status"='Absent'   WHERE "status"='Abscent'`,
    );
    await this.runSafe(
      'fix Refuneded→Refunded',
      `UPDATE "order_entity" SET "status"='Refunded' WHERE "status"='Refuneded'`,
    );
  }
}
