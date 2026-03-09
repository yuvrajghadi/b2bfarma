-- ============================================
-- IMMEDIATE FIX: Run this NOW
-- ============================================
-- This will allow your app to start immediately

-- OPTION A: If you want to keep the data
-- Generate unique batch numbers for rows with NULL
UPDATE product_batches
SET "batchNumber" = CONCAT('BATCH-', SUBSTRING(id, 1, 8))
WHERE "batchNumber" IS NULL;

-- OPTION B: If you want to delete invalid data
-- DELETE FROM product_batches WHERE "batchNumber" IS NULL;

-- Verify fix
SELECT 
  COUNT(*) as null_count,
  (SELECT COUNT(*) FROM product_batches) as total_count
FROM product_batches 
WHERE "batchNumber" IS NULL;

-- Expected: null_count = 0

-- ============================================
-- After running this, your app should start!
-- ============================================
