# Farmaapk Backend

A modular, scalable backend for an e-commerce/pharmacy platform built with NestJS and TypeScript. This backend provides robust APIs for authentication, user management, product catalog, cart, orders, payments, shipping, and more.

## 🚀 Quick Start
New to this project? Start here: [Quick Start Guide](QUICK_START.md)

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Modules](#modules)
- [Development](#development)
- [Testing](#testing)
- [Docker](#docker)
- [License](#license)

## Features
- JWT-based authentication (login, registration, refresh tokens)
- User and role management
- Product, brand, and category management
- Cart and order processing
- Payment handling
- Shipping and shipment tracking
- CSV upload for bulk data operations
- Modular, maintainable codebase
- TypeScript support
- Dockerized for easy deployment

## Project Structure
```
farmaapk-backend/
├── docker-compose.yml
├── Dockerfile
├── nest-cli.json
├── package.json
├── tsconfig*.json
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── brands/
│   │   ├── cart/
│   │   ├── categories/
│   │   ├── csv-upload/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── products/
│   │   ├── roles/
│   │   ├── shipping/
│   │   └── users/
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Docker (optional, for containerized deployment)
- PostgreSQL (v13+)

### Required Dependencies
Install the following npm packages for Excel import functionality:
```bash
npm install @nestjs/platform-express xlsx
npm install -D @types/multer
```

Core dependencies:
```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install class-validator class-transformer
```

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd farmaapk-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Configure environment variables (see [Environment Variables](#environment-variables)).
4. Start the development server:
   ```bash
   npm run start:dev
   ```

### Docker
To run with Docker:
```bash
docker-compose up --build
```

## Environment Variables
Create a `.env` file in the root directory. Example variables:
```
DATABASE_URL=postgres://user:password@localhost:5432/farmaapk
JWT_SECRET=your_jwt_secret
PORT=3000
```

## API Overview
The backend exposes RESTful APIs for all modules. Example endpoints:
- `POST /auth/login` — User login
- `POST /auth/register` — User registration
- `GET /products` — List products
- `GET /products/inventory` — Get flattened inventory with batches
- `POST /products/import` — Import products from Excel (Admin only)
- `POST /orders` — Create order
- `GET /users/me` — Get current user profile

### Excel Import Feature
The products module supports bulk import via Excel files:
- **Endpoint**: `POST /products/import`
- **Auth**: JWT + Admin role required
- **File format**: .xlsx or .xls
- **Max file size**: 10MB

#### Excel Column Mapping
```
SR                → (ignored)
DRUG Code         → products.drugCode
Product Name      → products.drugName (UNIQUE)
Unit              → products.unit
REQUIRED QTY      → (ignored)
M.R.P             → product_batches.mrp
Sales Price       → product_batches.salesPrice
Batch             → product_batches.batchNumber
EXP               → product_batches.expiryDate
ORDER IN STRIPS   → (ignored)
ORDER VAL         → (ignored)
Current Stock     → product_batches.quantity
DISCOUNT          → product_batches.discount
```

#### Import Business Rules
- Products are identified by unique `drugName`
- If product doesn't exist, it's created automatically
- Each row creates a new batch for the product
- Duplicate batches (same batchNumber for same product) are skipped
- Product availability status is auto-calculated:
  - `>10 units` → InStock
  - `1-10 units` → LowStock
  - `0 units` → OutOfStock
- Transaction rollback on critical errors

#### Import Response
```json
{
  "totalRows": 100,
  "productsCreated": 45,
  "batchesInserted": 98,
  "skippedRows": 2,
  "errors": [
    {
      "row": 15,
      "field": "Batch",
      "message": "Batch ABC123 already exists for this product"
    }
  ]
}
```

### Inventory API
The inventory endpoint provides a flattened view of products with all their batches:
- **Endpoint**: `GET /products/inventory`
- **Features**:
  - Search by product name or code
  - Filter by low stock
  - Filter by expiry (expiring within 3 months or already expired)
  - Pagination support
  - Optimized PostgreSQL queries

## Modules
- **auth**: Handles authentication, JWT, registration, login, refresh tokens
- **users**: User management, profile, roles
- **roles**: Role-based access control
- **products**: Product catalog, stock management
- **brands**: Brand management
- **categories**: Product categories
- **cart**: Shopping cart, cart items
- **orders**: Order creation, status updates
- **payments**: Payment processing
- **shipping**: Shipment and delivery tracking
- **csv-upload**: Bulk data upload via CSV

## Development
- Code style: TypeScript, follows NestJS best practices
- Linting: `npm run lint`
- Build: `npm run build`
- Start: `npm run start` or `npm run start:dev`
- Generate Excel template: `npm run generate:excel-template`

## Documentation
- [Excel Import Guide](EXCEL_IMPORT_GUIDE.md) - Comprehensive guide for Excel import feature
- [Package Installation](PACKAGE_INSTALLATION.md) - Required dependencies and setup
- [Testing Guide](TESTING_GUIDE.md) - Complete testing scenarios and examples

## Database Migrations
```bash
# Generate migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Testing
- Add and run tests as needed (Jest recommended)
- Example: `npm run test`

## Docker
- `docker-compose.yml` and `Dockerfile` provided for containerized deployment
- Configure environment variables in `.env` or via Docker secrets

## License
[MIT](LICENSE)
