# Excel Import Implementation Guide

## Overview
This document provides comprehensive implementation details for the Excel import feature in the Products module.

## Installation

### 1. Install Required Packages
```bash
npm install @nestjs/platform-express xlsx
npm install -D @types/multer
```

### 2. Database Migration
Run the following SQL to create the new schema (or use TypeORM migrations):

```sql
-- Update products table
ALTER TABLE products 
  DROP COLUMN IF EXISTS batch_number,
  DROP COLUMN IF EXISTS expiry_date,
  DROP COLUMN IF EXISTS quantity,
  DROP COLUMN IF EXISTS base_price,
  ADD COLUMN IF NOT EXISTS drug_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
  ALTER COLUMN availability_status SET DEFAULT 'OutOfStock';

-- Make drugName unique
ALTER TABLE products 
  ADD CONSTRAINT products_drug_name_unique UNIQUE (drug_name);

-- Create product_batches table
CREATE TABLE product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number VARCHAR(120) NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT DEFAULT 0,
  mrp DECIMAL(12,2) NOT NULL,
  sales_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_batch_unique UNIQUE (product_id, batch_number)
);

-- Create indexes
CREATE INDEX idx_product_batches_batch_number ON product_batches(batch_number);
CREATE INDEX idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX idx_products_drug_code ON products(drug_code);
```

## API Endpoints

### 1. Import Products from Excel
**Endpoint**: `POST /products/import`

**Authentication**: Required (JWT)

**Authorization**: Admin role only

**Content-Type**: `multipart/form-data`

**Request**:
```bash
curl -X POST http://localhost:3000/products/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@products.xlsx"
```

**Response**:
```json
{
  "totalRows": 150,
  "productsCreated": 75,
  "batchesInserted": 145,
  "skippedRows": 5,
  "errors": [
    {
      "row": 12,
      "field": "EXP",
      "message": "Invalid expiry date format"
    },
    {
      "row": 45,
      "field": "Batch",
      "message": "Batch ABC123 already exists for this product"
    }
  ]
}
```

### 2. Get Inventory
**Endpoint**: `GET /products/inventory`

**Authentication**: Required (JWT)

**Query Parameters**:
- `search` (optional): Search by product name or drug code
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Items per page
- `lowStockOnly` (optional): Set to 'true' to filter low stock items
- `expiryFilter` (optional): 'expiring' (within 3 months) or 'expired'

**Example Request**:
```bash
curl -X GET "http://localhost:3000/products/inventory?search=aspirin&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "items": [
    {
      "productId": "uuid-1",
      "drugName": "Aspirin 500mg",
      "drugCode": "ASP500",
      "unit": "Tablet",
      "availabilityStatus": "InStock",
      "batchId": "uuid-batch-1",
      "batchNumber": "BATCH001",
      "expiryDate": "2026-12-31",
      "quantity": 500,
      "mrp": 10.50,
      "salesPrice": 9.00,
      "discount": 14.29,
      "brandName": "PharmaCorp",
      "categoryName": "Pain Relief"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

## Excel File Format

### Required Columns
| Column Name     | Type    | Required | Mapped To                   |
|----------------|---------|----------|----------------------------|
| SR             | Number  | No       | (Ignored)                  |
| DRUG Code      | Text    | No       | products.drugCode          |
| Product Name   | Text    | Yes      | products.drugName          |
| Unit           | Text    | No       | products.unit              |
| REQUIRED QTY   | Number  | No       | (Ignored)                  |
| M.R.P          | Decimal | Yes      | product_batches.mrp        |
| Sales Price    | Decimal | Yes      | product_batches.salesPrice |
| Batch          | Text    | Yes      | product_batches.batchNumber|
| EXP            | Date    | Yes      | product_batches.expiryDate |
| ORDER IN STRIPS| Number  | No       | (Ignored)                  |
| ORDER VAL      | Number  | No       | (Ignored)                  |
| Current Stock  | Number  | Yes      | product_batches.quantity   |
| DISCOUNT       | Decimal | No       | product_batches.discount   |

### Sample Excel Data
```
SR | DRUG Code | Product Name      | Unit   | M.R.P | Sales Price | Batch   | EXP        | Current Stock | DISCOUNT
1  | ASP500    | Aspirin 500mg     | Tablet | 10.50 | 9.00       | B001    | 31/12/2026 | 500           | 14.29
2  | PAR650    | Paracetamol 650mg | Tablet | 5.00  | 4.50       | B002    | 15/06/2027 | 1000          | 10.00
```

## Business Logic

### Product Creation
1. System checks if product exists by `drugName`
2. If not exists, creates new product with:
   - drugName (unique)
   - drugCode (optional)
   - unit (optional)
   - availabilityStatus (default: OutOfStock)

### Batch Creation
1. Validates all required fields
2. Checks for duplicate batch (same batchNumber for same product)
3. Creates new batch with all batch-specific data
4. Updates product's total stock
5. Recalculates availability status

### Availability Status Calculation
```typescript
Total Stock > 10  → InStock
Total Stock 1-10  → LowStock
Total Stock = 0   → OutOfStock
```

### Transaction Handling
- Uses QueryRunner for transaction management
- All operations are atomic
- Rollback on any critical error
- Individual row errors are logged but don't stop the import

## Error Handling

### Validation Errors
| Error | Description |
|-------|-------------|
| Product Name is required | Missing product name |
| Batch is required | Missing batch number |
| Expiry date is required | Missing expiry date |
| Invalid expiry date format | Date cannot be parsed |
| M.R.P must be a valid number | Invalid numeric value |
| Sales Price must be a valid number | Invalid numeric value |
| Batch already exists | Duplicate batch for product |

### File Upload Errors
- File size exceeds 10MB
- Invalid file type (only .xlsx, .xls allowed)
- No file uploaded

## Performance Optimization

### Database Indexes
- Unique index on `products.drugName`
- Index on `products.drugCode`
- Composite unique index on `(product_id, batch_number)`
- Index on `product_batches.expiry_date`
- Index on `product_batches.batch_number`

### Query Optimization
- Uses QueryBuilder for complex joins
- Batch operations within transactions
- Efficient stock calculation with SUM aggregation
- Pagination for large datasets

## Testing

### Test Import File
Create a test Excel file with:
- Valid products (should import successfully)
- Duplicate batches (should skip with error)
- Missing required fields (should skip with error)
- Invalid date formats (should skip with error)
- Large dataset (100+ rows for performance testing)

### API Testing with Postman
1. Import the endpoint as multipart/form-data
2. Add Authorization header with JWT token
3. Upload .xlsx file
4. Verify response summary
5. Check database for imported products and batches

## Security Considerations

1. **Authentication**: JWT required for all endpoints
2. **Authorization**: Admin role required for import
3. **File Validation**: 
   - MIME type checking
   - File size limit (10MB)
   - Only .xlsx and .xls allowed
4. **SQL Injection**: Protected by TypeORM parameterized queries
5. **Transaction Safety**: Rollback on errors prevents partial imports

## Monitoring & Logging

### Import Logs
- Total rows processed
- Products created
- Batches inserted
- Skipped rows with reasons
- Error details with row numbers

### Performance Metrics
- Import duration
- Rows per second
- Database query time
- Transaction commit time

## Future Enhancements

1. **Async Processing**: Queue-based import for large files
2. **Progress Updates**: WebSocket for real-time progress
3. **Validation Preview**: Preview errors before committing
4. **Template Download**: Download Excel template with headers
5. **Update Existing**: Allow updating existing batches
6. **Bulk Delete**: Delete batches via Excel
7. **Export**: Export inventory to Excel

## Troubleshooting

### Common Issues

**Issue**: "No file uploaded"
- **Solution**: Ensure `file` field name matches in FormData

**Issue**: "Only Excel files allowed"
- **Solution**: Check file extension is .xlsx or .xls

**Issue**: Transaction timeout
- **Solution**: Reduce batch size or increase timeout

**Issue**: Duplicate batch errors
- **Solution**: Check existing batches, use unique batch numbers

**Issue**: Date parsing errors
- **Solution**: Use DD/MM/YYYY format or Excel date format

## Support
For issues or questions, contact the development team or create an issue in the project repository.
