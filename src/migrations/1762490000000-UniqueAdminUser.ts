import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueAdminUser1762490000000 implements MigrationInterface {
  name = 'UniqueAdminUser1762490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE admin_id uuid;
      DECLARE admin_count integer;
      BEGIN
        SELECT id INTO admin_id FROM roles WHERE name = 'ADMIN' LIMIT 1;
        IF admin_id IS NULL THEN
          RAISE EXCEPTION 'ADMIN role not found; ensure roles are seeded before this migration.';
        END IF;

        SELECT COUNT(*) INTO admin_count FROM users WHERE "roleId" = admin_id;
        IF admin_count > 1 THEN
          RAISE EXCEPTION 'Multiple ADMIN users exist; resolve before adding unique constraint.';
        END IF;

        EXECUTE format(
          'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_users_admin_role" ON "users" ("roleId") WHERE "roleId" = %L',
          admin_id
        );
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uniq_users_admin_role"
    `);
  }
}
