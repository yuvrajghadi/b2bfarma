-- ============================================
-- DEVELOPMENT ONLY: Delete NULL batch rows
-- ============================================

-- BACKUP FIRST (if data matters)
-- CREATE TABLE product_batches_backup AS SELECT * FROM product_batches;

-- Delete rows with NULL batchNumber
DELETE FROM product_batches
WHERE "batchNumber" IS NULL;

-- Verify deletion
SELECT COUNT(*) FROM product_batches WHERE "batchNumber" IS NULL;
-- Should return 0

-- Then restart your NestJS app
