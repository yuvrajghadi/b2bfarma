import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminBusinessRoles1762300000000 implements MigrationInterface {
  name = 'AdminBusinessRoles1762300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "address" character varying(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "businessName" character varying(180)
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "gstNumber" character varying(40)
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE text
      USING "name"::text
    `);

    await queryRunner.query(`
      DO $$
      DECLARE admin_id uuid;
      DECLARE business_id uuid;
      BEGIN
        SELECT id INTO admin_id FROM roles WHERE upper(name) = 'ADMIN' LIMIT 1;
        IF admin_id IS NULL THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'ADMIN', now(), now())
          RETURNING id INTO admin_id;
        END IF;

        SELECT id INTO business_id
        FROM roles
        WHERE upper(name) IN ('BUSINESS', 'CUSTOMER', 'DISTRIBUTOR', 'PHARMACY', 'VIEWER', 'RETAILER')
        LIMIT 1;
        IF business_id IS NULL THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'BUSINESS', now(), now())
          RETURNING id INTO business_id;
        END IF;

        UPDATE users
        SET "roleId" = admin_id
        WHERE "roleId" IN (SELECT id FROM roles WHERE upper(name) IN ('ADMIN', 'MANAGER'));

        UPDATE users
        SET "roleId" = business_id
        WHERE "roleId" IN (
          SELECT id FROM roles WHERE upper(name) IN ('CUSTOMER', 'DISTRIBUTOR', 'PHARMACY', 'VIEWER', 'RETAILER', 'BUSINESS')
        );

        UPDATE roles SET "name" = 'ADMIN' WHERE id = admin_id;
        UPDATE roles SET "name" = 'BUSINESS' WHERE id = business_id;

        DELETE FROM roles WHERE id NOT IN (admin_id, business_id);
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_name_enum') THEN
          DROP TYPE roles_name_enum;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TYPE "roles_name_enum" AS ENUM ('ADMIN', 'BUSINESS')
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE "roles_name_enum"
      USING "name"::"roles_name_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE text
      USING "name"::text
    `);

    await queryRunner.query(`
      DO $$
      DECLARE admin_id uuid;
      DECLARE customer_id uuid;
      BEGIN
        SELECT id INTO admin_id FROM roles WHERE upper(name) = 'ADMIN' LIMIT 1;
        IF admin_id IS NULL THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'ADMIN', now(), now())
          RETURNING id INTO admin_id;
        END IF;

        SELECT id INTO customer_id FROM roles WHERE upper(name) = 'CUSTOMER' LIMIT 1;
        IF customer_id IS NULL THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'CUSTOMER', now(), now())
          RETURNING id INTO customer_id;
        END IF;

        UPDATE users
        SET "roleId" = admin_id
        WHERE "roleId" IN (SELECT id FROM roles WHERE upper(name) = 'ADMIN');

        UPDATE users
        SET "roleId" = customer_id
        WHERE "roleId" IN (SELECT id FROM roles WHERE upper(name) = 'BUSINESS');

        UPDATE roles SET "name" = 'ADMIN' WHERE id = admin_id;
        UPDATE roles SET "name" = 'CUSTOMER' WHERE id = customer_id;

        DELETE FROM roles WHERE id NOT IN (admin_id, customer_id);
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roles_name_enum') THEN
          DROP TYPE roles_name_enum;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TYPE "roles_name_enum" AS ENUM ('ADMIN', 'CUSTOMER')
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE "roles_name_enum"
      USING "name"::"roles_name_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "gstNumber"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "businessName"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "address"
    `);
  }
}
