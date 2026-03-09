-- Check for NULL batchNumber values
SELECT 
  pb.id,
  pb."batchNumber",
  pb."expiryDate",
  pb.quantity,
  pb."createdAt",
  p."drugName" as product_name
FROM product_batches pb
LEFT JOIN products p ON pb."productId" = p.id
WHERE pb."batchNumber" IS NULL;

-- Count NULL values
SELECT COUNT(*) as null_batch_count
FROM product_batches
WHERE "batchNumber" IS NULL;

-- Show all batches (for comparison)
SELECT COUNT(*) as total_batches
FROM product_batches;
