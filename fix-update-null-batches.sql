-- ============================================
-- DEVELOPMENT ONLY: Update NULL batchNumbers
-- ============================================

-- Generate unique batch numbers for NULL rows
UPDATE product_batches
SET "batchNumber" = CONCAT('BATCH-', id)
WHERE "batchNumber" IS NULL;

-- Alternative: Use timestamp-based batch numbers
UPDATE product_batches
SET "batchNumber" = CONCAT('LEGACY-', TO_CHAR("createdAt", 'YYYYMMDD'), '-', SUBSTRING(id, 1, 8))
WHERE "batchNumber" IS NULL;

-- Verify fix
SELECT COUNT(*) FROM product_batches WHERE "batchNumber" IS NULL;
-- Should return 0

-- Then restart your NestJS app
