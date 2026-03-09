# Quick Start Guide - Excel Import Feature

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (1 min)
```bash
npm install @nestjs/platform-express xlsx
npm install -D @types/multer
```

### Step 2: Run Migration (1 min)
```bash
npm run migration:run
```

### Step 3: Generate Test Excel File (30 sec)
```bash
npm run generate:excel-template
```
This creates `excel-templates/product-import-sample.xlsx`

### Step 4: Start Server (30 sec)
```bash
npm run start:dev
```

### Step 5: Test Import (2 min)

#### Get Admin Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

Save the `accessToken` from response.

#### Import Products
```bash
curl -X POST http://localhost:3000/products/import \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@excel-templates/product-import-sample.xlsx"
```

#### View Inventory
```bash
curl -X GET http://localhost:3000/products/inventory \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📝 Excel File Format

Your Excel file must have these columns:

| Required Columns | Optional Columns |
|------------------|------------------|
| Product Name     | DRUG Code        |
| Batch            | Unit             |
| M.R.P            | DISCOUNT         |
| Sales Price      | SR               |
| Current Stock    | REQUIRED QTY     |
| EXP              | ORDER IN STRIPS  |
|                  | ORDER VAL        |

### Sample Row
```
Product Name: Aspirin 500mg
DRUG Code: ASP500
Unit: Tablet
Batch: BATCH001
M.R.P: 10.50
Sales Price: 9.00
Current Stock: 500
EXP: 31/12/2026
DISCOUNT: 14.29
```

## 🎯 Quick Tests

### Test 1: Import Products
```bash
POST http://localhost:3000/products/import
Headers: Authorization: Bearer <token>
Body: file=products.xlsx
```

### Test 2: Search Inventory
```bash
GET http://localhost:3000/products/inventory?search=aspirin
Headers: Authorization: Bearer <token>
```

### Test 3: Low Stock Items
```bash
GET http://localhost:3000/products/inventory?lowStockOnly=true
Headers: Authorization: Bearer <token>
```

### Test 4: Expiring Products
```bash
GET http://localhost:3000/products/inventory?expiryFilter=expiring
Headers: Authorization: Bearer <token>
```

## 🔍 Common Issues

### ❌ "No file uploaded"
**Fix**: Use form-data with field name `file`
```bash
-F "file=@path/to/file.xlsx"
```

### ❌ "Only Excel files allowed"
**Fix**: Ensure file extension is `.xlsx` or `.xls`

### ❌ "Unauthorized"
**Fix**: Include JWT token in Authorization header
```bash
-H "Authorization: Bearer YOUR_TOKEN"
```

### ❌ "Forbidden resource"
**Fix**: Login as Admin user (regular users cannot import)

### ❌ "Batch already exists"
**Info**: This is normal for duplicate batches. They are skipped.

## 📊 Response Format

### Success Response
```json
{
  "totalRows": 10,
  "productsCreated": 10,
  "batchesInserted": 10,
  "skippedRows": 0,
  "errors": []
}
```

### Partial Success (with errors)
```json
{
  "totalRows": 10,
  "productsCreated": 8,
  "batchesInserted": 8,
  "skippedRows": 2,
  "errors": [
    {
      "row": 5,
      "field": "M.R.P",
      "message": "M.R.P must be a valid number"
    },
    {
      "row": 7,
      "field": "Batch",
      "message": "Batch ABC123 already exists for this product"
    }
  ]
}
```

## 🎨 Postman Quick Setup

1. **Create new request**: `POST http://localhost:3000/products/import`
2. **Headers**: Add `Authorization: Bearer <token>`
3. **Body**: Select `form-data`
4. **Add field**: Key=`file`, Type=`File`, Value=Select Excel file
5. **Send**

## 🔧 NPM Scripts

```bash
# Development
npm run start:dev          # Start dev server
npm run build              # Build for production
npm run start:prod         # Start production server

# Database
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration

# Utilities
npm run generate:excel-template  # Generate test Excel files

# Testing
npm test                   # Run tests
npm run test:watch        # Run tests in watch mode
```

## 📚 Documentation Links

- [Full Implementation Guide](EXCEL_IMPORT_GUIDE.md)
- [Installation Guide](PACKAGE_INSTALLATION.md)
- [Testing Scenarios](TESTING_GUIDE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

## 🆘 Need Help?

1. **Check logs**: Look at terminal output for errors
2. **Verify database**: Ensure PostgreSQL is running
3. **Check migration**: Run `npm run migration:run` again
4. **Read guides**: See documentation links above
5. **Test with sample**: Use generated sample Excel file first

## ✅ Checklist

Before deploying:
- [ ] Dependencies installed
- [ ] Migration completed successfully
- [ ] Test import works with sample file
- [ ] Inventory endpoint returns data
- [ ] Authentication working
- [ ] Admin role verified
- [ ] Error handling tested
- [ ] Production environment variables set

## 🎉 You're Ready!

The Excel import feature is now set up and ready to use. Start importing products!

---

**Next Steps**:
1. Create your own Excel file following the format
2. Import products to your database
3. Query inventory using various filters
4. Integrate with your frontend application

Happy coding! 🚀
