import { MigrationInterface, QueryRunner } from 'typeorm';

export class UppercaseRolesEnum1761440800000 implements MigrationInterface {
  name = 'UppercaseRolesEnum1761440800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily convert enum column to text for safe remapping
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
        SELECT id INTO admin_id FROM roles WHERE lower(name) = 'admin' LIMIT 1;
        IF admin_id IS NULL THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'ADMIN', now(), now())
          RETURNING id INTO admin_id;
        END IF;

        SELECT id INTO customer_id FROM roles WHERE lower(name) = 'customer' LIMIT 1;
        IF customer_id IS NULL THEN
          INSERT INTO roles ("id", "name", "createdAt", "updatedAt")
          VALUES (uuid_generate_v4(), 'CUSTOMER', now(), now())
          RETURNING id INTO customer_id;
        END IF;

        UPDATE users
        SET "roleId" = customer_id
        WHERE "roleId" IN (
          SELECT id FROM roles WHERE lower(name) <> 'admin'
        );

        DELETE FROM roles WHERE id NOT IN (admin_id, customer_id);

        UPDATE roles SET "name" = 'ADMIN' WHERE id = admin_id;
        UPDATE roles SET "name" = 'CUSTOMER' WHERE id = customer_id;
      END $$;
    `);

    // Drop old enum if it exists and recreate with uppercase values
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE text
      USING "name"::text
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
      CREATE TYPE "roles_name_enum" AS ENUM ('Admin', 'Distributor', 'Retailer')
    `);

    await queryRunner.query(`
      UPDATE roles SET "name" = 'Admin' WHERE upper(name) = 'ADMIN'
    `);

    await queryRunner.query(`
      UPDATE roles SET "name" = 'Retailer' WHERE upper(name) = 'CUSTOMER'
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE "roles_name_enum"
      USING "name"::"roles_name_enum"
    `);
  }
}
