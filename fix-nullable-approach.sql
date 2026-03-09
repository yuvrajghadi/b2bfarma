-- ============================================
-- STEP 2: Clean NULL data while app is running
-- ============================================

-- Check how many need fixing
SELECT COUNT(*) FROM product_batches WHERE "batchNumber" IS NULL;

-- Update NULL values
UPDATE product_batches
SET "batchNumber" = CONCAT('BATCH-', SUBSTRING(id, 1, 8))
WHERE "batchNumber" IS NULL;

-- Verify all fixed
SELECT COUNT(*) FROM product_batches WHERE "batchNumber" IS NULL;
-- Should return 0

-- ============================================
-- STEP 3: After data is clean, make NOT NULL
-- ============================================

-- Then update entity back to:
-- @Column({ length: 120 })
-- batchNumber: string;

-- TypeORM will add NOT NULL constraint on next sync
