import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBatchNumberNotNull1740518400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update NULL values to default
    await queryRunner.query(`
      UPDATE product_batches
      SET "batchNumber" = CONCAT('LEGACY-', TO_CHAR("createdAt", 'YYYYMMDD'), '-', SUBSTRING(id, 1, 8))
      WHERE "batchNumber" IS NULL;
    `);

    // Step 2: Add NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE product_batches
      ALTER COLUMN "batchNumber" SET NOT NULL;
    `);

    // Step 3: Add check to prevent empty strings
    await queryRunner.query(`
      ALTER TABLE product_batches
      ADD CONSTRAINT "CHK_batchNumber_not_empty"
      CHECK (LENGTH(TRIM("batchNumber")) > 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: Remove check constraint
    await queryRunner.query(`
      ALTER TABLE product_batches
      DROP CONSTRAINT IF EXISTS "CHK_batchNumber_not_empty";
    `);

    // Reverse: Make column nullable again
    await queryRunner.query(`
      ALTER TABLE product_batches
      ALTER COLUMN "batchNumber" DROP NOT NULL;
    `);
  }
}
