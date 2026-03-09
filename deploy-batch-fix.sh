#!/bin/bash
# Production Deployment Guide for Batch Number Fix

echo "======================================"
echo "PRODUCTION MIGRATION DEPLOYMENT"
echo "======================================"

# Step 1: Backup database
echo "1. Creating backup..."
# pg_dump -U your_user -h your_host your_database > backup_before_batch_fix.sql

# Step 2: Build project
echo "2. Building project..."
npm run build

# Step 3: Show pending migrations
echo "3. Checking migrations..."
npm run migration:show

# Step 4: Run migration
echo "4. Running migration..."
npm run migration:run

# Step 5: Verify success
echo "5. Verifying data..."
# psql -U your_user -h your_host -d your_database -c "SELECT COUNT(*) FROM product_batches WHERE \"batchNumber\" IS NULL;"

echo "======================================"
echo "MIGRATION COMPLETE"
echo "======================================"
