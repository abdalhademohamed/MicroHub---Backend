import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('internal')
export class MigrateController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get('migrate')
  async runMigrations(@Query('key') key: string) {
    if (!key || key !== process.env.MIGRATE_SECRET_KEY) {
      throw new UnauthorizedException('Invalid migration key');
    }

    const results: { label: string; status: string; message?: string }[] = [];

    const run = async (label: string, sql: string) => {
      try {
        await this.ds.query(sql);
        results.push({ label, status: 'OK' });
      } catch (err: any) {
        results.push({ label, status: 'SKIP', message: err?.message });
      }
    };

    // ── Columns ──────────────────────────────────────────────────────────────
    await run('branch isactive',    `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "isactive"   boolean          NOT NULL DEFAULT true`);
    await run('branch deleted_at',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    await run('branch created_by',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "created_by" character varying`);
    await run('branch updated_by',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "updated_by" character varying`);
    await run('branch deleted_by',  `ALTER TABLE "branch_entity"      ADD COLUMN IF NOT EXISTS "deleted_by" character varying`);
    await run('employee isactive',  `ALTER TABLE "employee_entity"    ADD COLUMN IF NOT EXISTS "isactive"   boolean          NOT NULL DEFAULT true`);
    await run('employee deleted_at',`ALTER TABLE "employee_entity"    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    await run('service isactive',   `ALTER TABLE "service_entity"     ADD COLUMN IF NOT EXISTS "isactive"   boolean          NOT NULL DEFAULT true`);
    await run('service deleted_at', `ALTER TABLE "service_entity"     ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    await run('reservation del_at', `ALTER TABLE "reservation_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    await run('customer deleted_at',`ALTER TABLE "customer_entity"    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    await run('order colorCode',    `ALTER TABLE "order_entity"       ADD COLUMN IF NOT EXISTS "colorCode"  character varying`);

    // ── offer_entity: rename isActive → isactive or add ───────────────────
    await run('offer isactive fix', `
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

    // ── sharable_offer_entity: same ────────────────────────────────────────
    await run('sharable_offer isactive fix', `
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

    // ── Enum values ───────────────────────────────────────────────────────
    await run('enum Absent',   `ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Absent'`);
    await run('enum Refunded', `ALTER TYPE "public"."order_entity_status_enum" ADD VALUE IF NOT EXISTS 'Refunded'`);

    // ── Fix bad enum data ─────────────────────────────────────────────────
    await run('fix Abscent→Absent',    `UPDATE "order_entity" SET "status"='Absent'   WHERE "status"='Abscent'`);
    await run('fix Refuneded→Refunded',`UPDATE "order_entity" SET "status"='Refunded' WHERE "status"='Refuneded'`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results,
    };
  }
}
