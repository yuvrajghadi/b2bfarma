# Testing Guide - Excel Import Feature

## Prerequisites

1. Backend server running on `http://localhost:3000`
2. Valid JWT token for authentication
3. Admin user account
4. Sample Excel file

## Setup

### 1. Get Authentication Token

```bash
# Register admin user (if not exists)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "Admin"
  }'

# Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "Admin"
  }
}
```

Save the `accessToken` for subsequent requests.

### 2. Generate Test Excel File

```bash
npm run generate:excel-template
```

This creates:
- `excel-templates/product-import-template.xlsx` (empty template)
- `excel-templates/product-import-sample.xlsx` (with sample data)

## Testing Scenarios

### Test 1: Successful Import

**Objective**: Import valid products from Excel

**Request**:
```bash
curl -X POST http://localhost:3000/products/import \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@excel-templates/product-import-sample.xlsx"
```

**Expected Response**:
```json
{
  "totalRows": 10,
  "productsCreated": 10,
  "batchesInserted": 10,
  "skippedRows": 0,
  "errors": []
}
```

**Verification**:
```bash
# List products
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get inventory
curl -X GET http://localhost:3000/products/inventory \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test 2: Duplicate Batch Import

**Objective**: Verify duplicate batch detection

**Steps**:
1. Import the same Excel file twice
2. Second import should skip all batches

**Expected Response (2nd import)**:
```json
{
  "totalRows": 10,
  "productsCreated": 0,
  "batchesInserted": 0,
  "skippedRows": 10,
  "errors": [
    {
      "row": 2,
      "field": "Batch",
      "message": "Batch BATCH001 already exists for this product"
    },
    // ... 9 more similar errors
  ]
}
```

### Test 3: Invalid Data Handling

**Create test file** `invalid-data.xlsx` with:
- Missing Product Name (row 2)
- Invalid M.R.P (row 3): "ABC" instead of number
- Missing Batch Number (row 4)
- Invalid Expiry Date (row 5): "INVALID"

**Expected Response**:
```json
{
  "totalRows": 4,
  "productsCreated": 0,
  "batchesInserted": 0,
  "skippedRows": 4,
  "errors": [
    {
      "row": 2,
      "field": "Product Name",
      "message": "Product Name is required"
    },
    {
      "row": 3,
      "field": "M.R.P",
      "message": "M.R.P must be a valid number"
    },
    {
      "row": 4,
      "field": "Batch",
      "message": "Batch is required"
    },
    {
      "row": 5,
      "field": "EXP",
      "message": "Invalid expiry date format"
    }
  ]
}
```

### Test 4: Large File Import

**Objective**: Test performance with large datasets

**Steps**:
1. Create Excel file with 1000+ rows
2. Import and measure time
3. Verify all data imported correctly

**Request**:
```bash
time curl -X POST http://localhost:3000/products/import \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@large-import.xlsx"
```

**Expected**: Import completes within reasonable time (< 30 seconds for 1000 rows)

### Test 5: File Type Validation

**Objective**: Verify file type restrictions

**Request with wrong file type**:
```bash
curl -X POST http://localhost:3000/products/import \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@test.pdf"
```

**Expected Response**:
```json
{
  "statusCode": 400,
  "message": "Only Excel files (.xlsx, .xls) are allowed",
  "error": "Bad Request"
}
```

### Test 6: File Size Validation

**Objective**: Verify 10MB file size limit

**Create large file** (> 10MB)

**Expected Response**:
```json
{
  "statusCode": 413,
  "message": "File too large",
  "error": "Payload Too Large"
}
```

### Test 7: Unauthorized Access

**Objective**: Verify JWT authentication

**Request without token**:
```bash
curl -X POST http://localhost:3000/products/import \
  -F "file=@product-import-sample.xlsx"
```

**Expected Response**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Test 8: Non-Admin Access

**Objective**: Verify role-based access control

**Steps**:
1. Login as regular user (non-admin)
2. Attempt import

**Expected Response**:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### Test 9: Inventory Query - Search

**Objective**: Test inventory search functionality

**Request**:
```bash
curl -X GET "http://localhost:3000/products/inventory?search=Aspirin" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected**: Returns only products matching "Aspirin"

### Test 10: Inventory Query - Low Stock Filter

**Objective**: Filter low stock items

**Request**:
```bash
curl -X GET "http://localhost:3000/products/inventory?lowStockOnly=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected**: Returns only products with LowStock status (1-10 units)

### Test 11: Inventory Query - Expiring Products

**Objective**: Find products expiring within 3 months

**Request**:
```bash
curl -X GET "http://localhost:3000/products/inventory?expiryFilter=expiring" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected**: Returns batches expiring in next 3 months

### Test 12: Inventory Query - Expired Products

**Objective**: Find already expired products

**Request**:
```bash
curl -X GET "http://localhost:3000/products/inventory?expiryFilter=expired" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected**: Returns batches with expiry date < today

### Test 13: Pagination

**Objective**: Test inventory pagination

**Request**:
```bash
# Page 1, 10 items per page
curl -X GET "http://localhost:3000/products/inventory?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Page 2
curl -X GET "http://localhost:3000/products/inventory?page=2&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Verification**:
- Check `total`, `page`, `limit`, `totalPages` in response
- Verify different items returned for different pages

### Test 14: Availability Status Calculation

**Create Excel with varying stock levels**:
- Product A: 50 units (should be InStock)
- Product B: 5 units (should be LowStock)
- Product C: 0 units (should be OutOfStock)

**Verification**:
```bash
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected**: Each product has correct `availabilityStatus`

## Postman Collection

Import this collection for easier testing:

```json
{
  "info": {
    "name": "Products Import - Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"admin@example.com\",\"password\":\"Admin@123\"}"
        },
        "url": {"raw": "{{baseUrl}}/auth/login"}
      }
    },
    {
      "name": "Import Products",
      "request": {
        "method": "POST",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
        "body": {
          "mode": "formdata",
          "formdata": [{"key": "file", "type": "file"}]
        },
        "url": {"raw": "{{baseUrl}}/products/import"}
      }
    },
    {
      "name": "Get Inventory",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
        "url": {
          "raw": "{{baseUrl}}/products/inventory?page=1&limit=20",
          "query": [
            {"key": "search", "value": "", "disabled": true},
            {"key": "lowStockOnly", "value": "true", "disabled": true},
            {"key": "expiryFilter", "value": "expiring", "disabled": true}
          ]
        }
      }
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:3000"},
    {"key": "token", "value": ""}
  ]
}
```

## Automated Testing with Jest

Create test file: `src/modules/products/products.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductBatch } from './product-batch.entity';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';

describe('ProductsService - Import', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: { /* mock repository */ },
        },
        {
          provide: getRepositoryToken(ProductBatch),
          useValue: { /* mock repository */ },
        },
        {
          provide: DataSource,
          useValue: { /* mock data source */ },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should import valid Excel file', async () => {
    // Create mock Excel buffer
    const worksheet = XLSX.utils.json_to_sheet([
      {
        'Product Name': 'Test Product',
        'Batch': 'BATCH001',
        'M.R.P': 10,
        'Sales Price': 9,
        'Current Stock': 100,
        'EXP': '31/12/2026',
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Test import
    const result = await service.importFromExcel(buffer);
    
    expect(result.totalRows).toBe(1);
    expect(result.productsCreated).toBeGreaterThan(0);
  });
});
```

Run tests:
```bash
npm test -- products.service.spec.ts
```

## Performance Benchmarks

Expected performance metrics:

| Rows | Import Time | Products Created | Batches Inserted |
|------|-------------|------------------|------------------|
| 10   | < 1s        | 10               | 10               |
| 100  | < 5s        | 100              | 100              |
| 500  | < 15s       | 500              | 500              |
| 1000 | < 30s       | 1000             | 1000             |

## Troubleshooting Tests

### Issue: Token expired
**Solution**: Login again to get fresh token

### Issue: Transaction timeout
**Solution**: Check database connection, increase timeout in TypeORM config

### Issue: File upload fails
**Solution**: 
- Check Multer is properly configured
- Verify file size < 10MB
- Ensure file field name is "file"

### Issue: Availability status not updating
**Solution**: 
- Verify product has batches
- Check calculateAvailabilityStatus logic
- Ensure transaction committed successfully

## CI/CD Integration

Add to GitHub Actions:

```yaml
name: Test Import Feature

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run migration:run
      - run: npm test
```

## Next Steps

1. Run all tests and document results
2. Create performance benchmarks
3. Set up monitoring for production imports
4. Create user documentation
5. Train users on Excel format requirements
