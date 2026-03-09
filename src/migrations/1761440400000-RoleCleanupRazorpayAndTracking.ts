import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleCleanupRazorpayAndTracking1761440400000 implements MigrationInterface {
  name = 'RoleCleanupRazorpayAndTracking1761440400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Products: soft delete flag
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "isDeleted" boolean NOT NULL DEFAULT false
    `);

    // Shipments: tracking improvements
    await queryRunner.query(`
      ALTER TABLE "shipments"
      ADD COLUMN IF NOT EXISTS "currentLocation" character varying(200)
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments"
      ADD COLUMN IF NOT EXISTS "estimatedDeliveryDate" TIMESTAMP WITH TIME ZONE
    `);

    // Orders: add Processing status
    await queryRunner.query(`
      ALTER TYPE "orders_status_enum"
      ADD VALUE IF NOT EXISTS 'Processing'
    `);

    // Roles: ensure Customer exists, migrate users, remove old roles
    await queryRunner.query(`
      ALTER TYPE "roles_name_enum"
      ADD VALUE IF NOT EXISTS 'Customer'
    `);

    await queryRunner.query(`
      DO $$
      DECLARE customer_id uuid;
      BEGIN
        SELECT id INTO customer_id FROM roles WHERE name = 'Customer' LIMIT 1;
        IF customer_id IS NULL THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'Customer', now(), now())
          RETURNING id INTO customer_id;
        END IF;

        UPDATE users
        SET "roleId" = customer_id
        WHERE "roleId" IN (SELECT id FROM roles WHERE name IN ('Distributor', 'Retailer'));

        DELETE FROM roles WHERE name IN ('Distributor', 'Retailer');
      END $$;
    `);

    // Recreate roles enum without Distributor/Retailer
    await queryRunner.query(`
      ALTER TYPE "roles_name_enum" RENAME TO "roles_name_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "roles_name_enum" AS ENUM ('Admin', 'Customer')
    `);
    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE "roles_name_enum"
      USING "name"::text::"roles_name_enum"
    `);
    await queryRunner.query(`
      DROP TYPE "roles_name_enum_old"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert roles enum to include Distributor/Retailer
    await queryRunner.query(`
      ALTER TYPE "roles_name_enum" RENAME TO "roles_name_enum_new"
    `);
    await queryRunner.query(`
      CREATE TYPE "roles_name_enum" AS ENUM ('Admin', 'Distributor', 'Retailer')
    `);
    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE "roles_name_enum"
      USING (
        CASE
          WHEN "name" = 'Customer' THEN 'Retailer'
          ELSE "name"::text
        END
      )::"roles_name_enum"
    `);
    await queryRunner.query(`
      DROP TYPE "roles_name_enum_new"
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Distributor') THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'Distributor', now(), now());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Retailer') THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'Retailer', now(), now());
        END IF;
      END $$;
    `);

    // Revert orders enum to remove Processing
    await queryRunner.query(`
      ALTER TYPE "orders_status_enum" RENAME TO "orders_status_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "orders_status_enum" AS ENUM ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled')
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ALTER COLUMN "status" TYPE "orders_status_enum"
      USING (
        CASE
          WHEN "status" = 'Processing' THEN 'Confirmed'
          ELSE "status"::text
        END
      )::"orders_status_enum"
    `);
    await queryRunner.query(`
      DROP TYPE "orders_status_enum_old"
    `);

    // Remove shipment tracking columns
    await queryRunner.query(`
      ALTER TABLE "shipments"
      DROP COLUMN IF EXISTS "estimatedDeliveryDate"
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments"
      DROP COLUMN IF EXISTS "currentLocation"
    `);

    // Remove product soft delete flag
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "isDeleted"
    `);
  }
}
