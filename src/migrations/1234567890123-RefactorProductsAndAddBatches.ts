import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorProductsAndAddBatches1234567890123 implements MigrationInterface {
  name = 'RefactorProductsAndAddBatches1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create product_batches table
    await queryRunner.query(`
      CREATE TABLE "product_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "batchNumber" character varying(120) NOT NULL,
        "expiryDate" date NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "mrp" numeric(12,2) NOT NULL,
        "salesPrice" numeric(12,2) NOT NULL,
        "discount" numeric(5,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "productId" uuid,
        CONSTRAINT "PK_product_batches" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on product_batches
    await queryRunner.query(`
      CREATE INDEX "IDX_product_batches_batch_number" ON "product_batches" ("batchNumber")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_batches_expiry_date" ON "product_batches" ("expiryDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_batches_product_id" ON "product_batches" ("productId")
    `);

    // Create unique constraint on product_id + batch_number
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_product_batches_product_batch_unique" 
      ON "product_batches" ("productId", "batchNumber")
    `);

    // Add new columns to products table
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD COLUMN "drugCode" character varying(100),
      ADD COLUMN "unit" character varying(50)
    `);

    // Create index on drugCode
    await queryRunner.query(`
      CREATE INDEX "IDX_products_drug_code" ON "products" ("drugCode")
    `);

    // Make drugName unique
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_products_drug_name_unique" ON "products" ("drugName")
    `);

    // Migrate existing product data to batches (if you have existing data)
    // This creates a batch for each existing product with current stock info
    await queryRunner.query(`
      INSERT INTO "product_batches" 
        ("productId", "batchNumber", "expiryDate", "quantity", "mrp", "salesPrice", "discount", "createdAt", "updatedAt")
      SELECT 
        "id",
        COALESCE("batchNumber", 'MIGRATED-' || "id"),
        COALESCE("expiryDate", CURRENT_DATE + INTERVAL '1 year'),
        COALESCE("quantity", 0),
        COALESCE("basePrice", 0),
        COALESCE("basePrice", 0),
        0,
        "createdAt",
        "updatedAt"
      FROM "products"
      WHERE "batchNumber" IS NOT NULL AND "expiryDate" IS NOT NULL
    `);

    // Remove old columns from products
    await queryRunner.query(`
      ALTER TABLE "products" 
      DROP COLUMN IF EXISTS "batchNumber",
      DROP COLUMN IF EXISTS "expiryDate",
      DROP COLUMN IF EXISTS "quantity",
      DROP COLUMN IF EXISTS "basePrice"
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "product_batches" 
      ADD CONSTRAINT "FK_product_batches_product" 
      FOREIGN KEY ("productId") 
      REFERENCES "products"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    // Update availability status default
    await queryRunner.query(`
      ALTER TABLE "products" 
      ALTER COLUMN "availabilityStatus" SET DEFAULT 'OutOfStock'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
    await queryRunner.query(`
      ALTER TABLE "product_batches" 
      DROP CONSTRAINT "FK_product_batches_product"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_product_batches_product_batch_unique"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_product_batches_product_id"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_product_batches_expiry_date"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_product_batches_batch_number"
    `);

    await queryRunner.query(`
      DROP TABLE "product_batches"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_products_drug_name_unique"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_products_drug_code"
    `);

    await queryRunner.query(`
      ALTER TABLE "products" 
      DROP COLUMN "unit",
      DROP COLUMN "drugCode"
    `);

    // Restore old columns (optional, depends on your needs)
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD COLUMN "batchNumber" character varying(120),
      ADD COLUMN "expiryDate" date,
      ADD COLUMN "quantity" integer DEFAULT 0,
      ADD COLUMN "basePrice" numeric(12,2)
    `);
  }
}
