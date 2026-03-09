# Farmaapk Backend - Project Summary

**Last Updated:** March 4, 2026  
**Version:** 1.0.0  
**Type:** B2B Pharma Ordering System  
**Status:** Production Ready ✅

---

## 📋 Quick Links
- **[README.md](README.md)** - Main documentation
- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Complete testing procedures
- **[EXCEL_IMPORT_GUIDE.md](EXCEL_IMPORT_GUIDE.md)** - Excel import feature
- **[ROLE_ARCHITECTURE.md](ROLE_ARCHITECTURE.md)** - Role system architecture

---

## 🎯 Overview

**Farmaapk Backend** is a B2B pharmaceutical ordering platform built with NestJS and TypeScript. It manages product inventory with multi-batch tracking, processes orders with FIFO stock deduction, handles payments via Razorpay, and coordinates shipments.

### Target Users
Pharmaceutical distributors, pharmacy chains, hospitals, and medical supply retailers.

### Key Features
- **Multi-batch inventory** with expiry tracking
- **Excel bulk import** with validation
- **Role-based access** (Admin, Manager, Customer)
- **Smart cart** with batch-aware pricing
- **FIFO order processing** (oldest batches first)
- **Payment integration** (Razorpay)
- **Real-time inventory** with low-stock alerts

---

## 🛠️ Tech Stack

- **Backend**: NestJS 10.x, TypeScript 5.x, Node.js 18+
- **Database**: PostgreSQL 13+, TypeORM 0.3.x
- **Auth**: JWT, Passport.js, bcrypt
- **Security**: Helmet, Rate limiting, CORS
- **File Processing**: xlsx (Excel), csv-parse
- **Payment**: Razorpay
- **DevOps**: Docker, Docker Compose

---

## 🏗️ Architecture

### Module Structure
```
src/
├── modules/
│   ├── auth/           Authentication & JWT
│   ├── users/          User management
│   ├── roles/          RBAC
│   ├── products/       Products & batches
│   ├── cart/           Shopping cart
│   ├── orders/         Order processing
│   ├── payments/       Payment integration
│   ├── shipping/       Shipment tracking
│   ├── brands/         Brand management
│   ├── categories/     Category management
│   └── csv-upload/     Bulk import
│
├── common/             Shared utilities
│   ├── decorators/     @CurrentUser, @Roles
│   ├── guards/         JWT, Roles guards
│   ├── filters/        Exception handling
│   └── enums/          Status enums
│
├── config/             Configuration
│   ├── typeorm.config.ts
│   └── validation.ts
│
└── migrations/         Database migrations
```

### Database Schema
**Key entities**: User, Role, Product, ProductBatch, Cart, Order, Payment, Shipment

**Important**: Products and Batches are separate entities (One-to-Many relationship)

---

## 🔌 API Endpoints Summary

### Authentication (`/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token

### Products (`/products`)
- `GET /products` - List products
- `GET /products/inventory` - Inventory with batch details
- `POST /products/import` - Excel bulk import (Admin)

### Cart & Orders (`/cart`, `/orders`)
- `POST /cart/items` - Add to cart
- `POST /orders` - Place order

### Payments & Shipping
- `POST /payments/checkout` - Create payment
- `POST /shipping` - Create shipment (Admin)

**Authentication**: All endpoints require JWT (except register/login)  
**Rate Limiting**: 60 requests per minute

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Run migrations
npm run migration:run

# 4. Start server
npm run start:dev

# Server runs on http://localhost:3000
```

### Docker
```bash
docker-compose up -d
```

---

## 📊 Project Status

### ✅ Completed
- Multi-batch product system
- Excel import with validation
- FIFO stock deduction
- Role-based access control
- Payment and shipping integration
- Low-stock and expiry alerts

### 📈 Recent Updates (2026)
- Refactored product/batch schema
- Added Excel import feature
- Implemented FIFO order processing
- Standardized role handling
- Added comprehensive testing

---

## 🔒 Security

- JWT with short-lived tokens (15min)
- bcrypt password hashing
- Role-based access control
- Rate limiting (60 req/min)
- Helmet security headers
- Input validation on all DTOs
- SQL injection protection via TypeORM

---

## 💡 Key Business Logic

### Availability Status
- **InStock**: Total stock > 10
- **LowStock**: Total stock 1-10
- **OutOfStock**: Total stock = 0

### Batch Pricing
Cart uses the **lowest price** from available batches

### Order Processing (FIFO)
Orders deduct stock from **oldest batches first** (by expiry date)

---

## 📚 Documentation

For detailed information, see:
- **[README.md](README.md)** - Complete project documentation
- **[QUICK_START.md](QUICK_START.md)** - Step-by-step setup
- **[EXCEL_IMPORT_GUIDE.md](EXCEL_IMPORT_GUIDE.md)** - Import feature guide
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Test scenarios
- **[ROLE_ARCHITECTURE.md](ROLE_ARCHITECTURE.md)** - Role system details

---

## 🛠️ Utility Commands

```bash
# Development
npm run start:dev           # Start with watch mode
npm run start:dev:alt       # Start on port 3001

# Database
npm run migration:run       # Run migrations
npm run migration:revert    # Revert last migration

# Utilities
npm run check-port          # Check port usage
npm run kill-node           # Kill Node processes
npm run generate:excel-template  # Create sample Excel

# Build & Production
npm run build               # Build for production
npm run start:prod          # Start production server
```

---

## 📞 Support

Check the detailed documentation files or review error logs in console for troubleshooting.

---

**Built with NestJS and TypeScript**
