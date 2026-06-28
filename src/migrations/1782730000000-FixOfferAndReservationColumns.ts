import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOfferAndReservationColumns1782730000000 implements MigrationInterface {
    name = 'FixOfferAndReservationColumns1782730000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix offer_entity: rename "isActive" → "isactive" if needed, or add if missing
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'offer_entity' AND column_name = 'isActive'
                ) THEN
                    ALTER TABLE "offer_entity" RENAME COLUMN "isActive" TO "isactive";
                ELSIF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'offer_entity' AND column_name = 'isactive'
                ) THEN
                    ALTER TABLE "offer_entity" ADD COLUMN "isactive" boolean NOT NULL DEFAULT true;
                END IF;
            END $$;
        `);

        // Fix sharable_offer_entity: same logic
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'sharable_offer_entity' AND column_name = 'isActive'
                ) THEN
                    ALTER TABLE "sharable_offer_entity" RENAME COLUMN "isActive" TO "isactive";
                ELSIF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'sharable_offer_entity' AND column_name = 'isactive'
                ) THEN
                    ALTER TABLE "sharable_offer_entity" ADD COLUMN "isactive" boolean NOT NULL DEFAULT true;
                END IF;
            END $$;
        `);

        // Fix reservation_entity: add deleted_at if missing
        await queryRunner.query(`ALTER TABLE "reservation_entity" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservation_entity" DROP COLUMN IF EXISTS "deleted_at"`);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'sharable_offer_entity' AND column_name = 'isactive'
                ) THEN
                    ALTER TABLE "sharable_offer_entity" RENAME COLUMN "isactive" TO "isActive";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'offer_entity' AND column_name = 'isactive'
                ) THEN
                    ALTER TABLE "offer_entity" RENAME COLUMN "isactive" TO "isActive";
                END IF;
            END $$;
        `);
    }
}
