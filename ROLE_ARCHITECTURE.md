# Role Architecture - Complete Guide

## 🎯 Standardized Role Structure

This document defines the **standardized role handling** across the entire NestJS application to prevent shape mismatches and maintain consistency.

---

## 📊 Role Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DATABASE (TypeORM Entity)                                   │
│    User.role = Role { id, name: "ADMIN", createdAt, updatedAt }│
│    ↓                                                            │
│    Full role object with all properties                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. AUTH SERVICE (register/login)                               │
│    user = await usersService.createUser({...})                 │
│    ↓                                                            │
│    generateTokens(user.id, user.email, user.role.name) ←─────┐│
│    ↓                                              Extract string││
│    JWT payload: { sub, email, role: "ADMIN" }                 ││
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. JWT STRATEGY (validate)                                     │
│    user = await usersService.findById(payload.sub)             │
│    ↓                                                            │
│    return { id, email, role: user.role.name } ←──────────────┐│
│    ↓                                       Extract string again││
│    Request.user = { id, email, role: "ADMIN" }                ││
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. CONTROLLERS (@CurrentUser() decorator)                      │
│    @Get()                                                       │
│    method(@CurrentUser() user: { id, email, role: RoleName }) │
│    ↓                                                            │
│    user.role === RoleName.ADMIN  ←── Direct string comparison  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. SERVICES (Business Logic)                                   │
│    method(user: { id: string; role: RoleName })               │
│    ↓                                                            │
│    if (user.role === RoleName.ADMIN) { ... }                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. GUARDS (Authorization)                                       │
│    const user = request.user;                                   │
│    return requiredRoles.includes(user?.role);                  │
│    ↓                                                            │
│    Direct string comparison with RoleName enum                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Correct Implementations

### 1. JWT Strategy (Extract Role from DB Entity)

**File:** `src/modules/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user.isActive) {
      throw new UnauthorizedException('User inactive');
    }
    
    // ✅ Extract role.name from database User entity
    // This converts role object → role string
    return { 
      id: user.id, 
      email: user.email, 
      role: user.role.name  // ← Extracts "ADMIN" from { id, name: "ADMIN", ... }
    };
  }
}
```

**Key Point:** The database User entity has `role` as an object, so we extract `.name` to get the string value.

---

### 2. Auth Service (Generate JWT with Role String)

**File:** `src/modules/auth/auth.service.ts`

```typescript
async register(dto: RegisterDto) {
  const role = dto.role ?? RoleName.CUSTOMER;
  const passwordHash = await bcrypt.hash(dto.password, saltRounds);

  // createUser returns User entity with role as object
  const user = await this.usersService.createUser({
    email: dto.email,
    passwordHash,
    fullName: dto.fullName,
    phone: dto.phone,
    role,
  });

  // ✅ Extract role.name when generating tokens
  const tokens = await this.generateTokens(
    user.id, 
    user.email, 
    user.role.name  // ← Extracts string from role object
  );
  
  return { user: this.usersService.sanitizeUser(user), ...tokens };
}

private async generateTokens(userId: string, email: string, role: RoleName) {
  // ✅ JWT payload contains role as string
  const payload = { sub: userId, email, role };
  
  const accessToken = await this.jwtService.signAsync(payload, {
    secret: this.configService.get<string>('JWT_SECRET'),
    expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
  });

  return { accessToken, refreshToken };
}
```

**Key Point:** When generating JWTs, extract `user.role.name` from the database entity.

---

### 3. RolesGuard (String Comparison)

**File:** `src/common/guards/roles.guard.ts`

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleName } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;  // From JWT Strategy: { id, email, role: "ADMIN" }
    
    // ✅ Direct string comparison - user.role is already a string
    return requiredRoles.includes(user?.role);
  }
}
```

**Key Point:** `request.user` comes from JWT Strategy, which already has `role` as a string.

---

### 4. Controllers (Type-Safe User Parameter)

**File:** `src/modules/products/products.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleName } from '../../common/enums/role.enum';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.productsService.list(query);
  }

  @Post()
  @Roles(RoleName.ADMIN)  // ✅ Guard checks user.role === RoleName.ADMIN
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { id: string; email: string; role: RoleName }
  ) {
    // ✅ user.role is RoleName (string enum)
    return this.productsService.create(dto);
  }
}
```

**Key Point:** Type `user.role` as `RoleName` for type safety.

---

### 5. Services (Accept Role String)

**File:** `src/modules/payments/payments.service.ts`

```typescript
async createRazorpayOrder(
  dto: CreateRazorpayOrderDto, 
  user: { id: string; role: RoleName }  // ✅ role is RoleName (string)
) {
  const order = await this.orderRepo.findOne({ 
    where: { id: dto.orderId }, 
    relations: ['user'] 
  });
  
  if (!order) {
    throw new BadRequestException('Order not found');
  }
  
  // ✅ Direct string comparison
  if (user.role !== RoleName.ADMIN && order.user.id !== user.id) {
    throw new ForbiddenException('Access denied');
  }
  
  // ... rest of logic
}
```

**Key Point:** Service methods accept `role: RoleName` (string), not the full User entity.

---

### 6. Example: CartService (Fixed)

**File:** `src/modules/cart/cart.service.ts`

```typescript
import { RoleName } from '../../common/enums/role.enum';

@Injectable()
export class CartService {
  // ✅ Accept role as RoleName string, not User entity
  async addItem(
    user: { id: string; role: RoleName }, 
    productId: string, 
    quantity: number
  ) {
    const cart = await this.getCartForUser(user.id);
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['batches'],
    });
    
    // ✅ Pass role string directly
    const unitPrice = await this.getPriceForProduct(product, user.role);
    
    // ... rest of logic
  }

  private async getPriceForProduct(
    product: Product, 
    role: RoleName  // ✅ Accept RoleName string
  ): Promise<number> {
    const basePrice = Math.min(...product.batches.map(b => b.salesPrice));
    
    // ✅ Pass role string to multiplier calculation
    return this.getPriceForUser(basePrice, role);
  }

  private getPriceForUser(basePrice: number, role: RoleName): number {
    // ✅ Direct use of RoleName string
    const multiplier = this.usersService.getRolePriceMultiplier(role);
    return Number((basePrice * multiplier).toFixed(2));
  }
}
```

**Key Point:** Services work with `role: RoleName` (string), not the full User/Role entity.

---

## 🚫 Incorrect Patterns (Avoid These)

### ❌ Wrong: Accessing .role.name in Controllers/Services

```typescript
// ❌ WRONG - user from @CurrentUser() already has role as string
@Post()
create(@CurrentUser() user: any) {
  if (user.role.name === RoleName.ADMIN) {  // TypeError: Cannot read 'name' of string
    // ...
  }
}
```

**Why it's wrong:** `@CurrentUser()` returns user from JWT Strategy, which already has `role` as a string.

---

### ❌ Wrong: Passing Full User Entity Unnecessarily

```typescript
// ❌ WRONG - Service expects User entity with role object
async someMethod(user: User) {
  const multiplier = this.service.calculate(user.role.name);
}

// But controller passes JWT user with role as string:
@Post()
action(@CurrentUser() user: any) {
  return this.service.someMethod(user);  // Type mismatch!
}
```

**Why it's wrong:** Mixing User entity type with JWT user type causes role shape mismatch.

---

### ❌ Wrong: Mixed Role Handling in Guards

```typescript
// ❌ WRONG - Inconsistent handling
canActivate(context: ExecutionContext): boolean {
  const user = request.user;
  // This suggests uncertainty about role shape
  return requiredRoles.includes(user?.role?.name ?? user?.role);
}
```

**Why it's wrong:** If role shape is standardized, no fallback logic is needed.

---

## 🛡️ Type Definitions

Create a shared type for request user:

**File:** `src/common/types/request-user.type.ts`

```typescript
import { RoleName } from '../enums/role.enum';

/**
 * User object attached to requests by JWT Strategy
 * This is NOT the full User database entity
 */
export interface RequestUser {
  id: string;
  email: string;
  role: RoleName;  // ← String enum, not Role entity
}
```

**Usage in controllers:**

```typescript
import { RequestUser } from '../../common/types/request-user.type';

@Controller('orders')
export class OrdersController {
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    // Type-safe access to user.role
    if (user.role === RoleName.ADMIN) {
      return this.ordersService.findAll();
    }
    return this.ordersService.findByUser(user.id);
  }
}
```

---

## 🎯 Best Practices

### 1. **Always Type Role as RoleName**

```typescript
// ✅ GOOD
function checkAccess(user: { id: string; role: RoleName }) {
  return user.role === RoleName.ADMIN;
}

// ❌ BAD
function checkAccess(user: any) {
  return user.role.name === 'ADMIN';
}
```

### 2. **Extract Role String at Boundaries**

```typescript
// ✅ GOOD - Extract at JWT creation and validation
const tokens = generateTokens(user.id, user.email, user.role.name);
return { id: user.id, email: user.email, role: user.role.name };

// ❌ BAD - Pass role object through JWT
return { id: user.id, email: user.email, role: user.role };  // Object in JWT!
```

### 3. **Use RoleName Enum for Comparisons**

```typescript
import { RoleName } from '../../common/enums/role.enum';

// ✅ GOOD - Type-safe enum comparison
if (user.role === RoleName.ADMIN) { }

// ❌ BAD - Magic string comparison
if (user.role === 'ADMIN') { }
```

### 4. **Validate Role Type in Guards**

```typescript
// ✅ GOOD - Ensures role is string
canActivate(context: ExecutionContext): boolean {
  const user = request.user;
  
  if (!user || typeof user.role !== 'string') {
    return false;
  }
  
  return requiredRoles.includes(user.role as RoleName);
}
```

### 5. **Document Where Role Objects vs Strings Are Used**

```typescript
/**
 * @param user - User from @CurrentUser() decorator
 *               Contains role as RoleName string
 */
async getOrders(user: { id: string; role: RoleName }) {
  // Implementation
}
```

---

## 🧪 Testing Role Handling

### Test JWT Payload Structure

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

# 2. Decode JWT at https://jwt.io
# Verify payload:
{
  "sub": "user-id",
  "email": "admin@test.com",
  "role": "ADMIN",  ← String, not object
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Test Debug Endpoint

```bash
# Use the debug endpoints
curl http://localhost:3000/debug/role-check \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "roleInfo": {
    "raw": "ADMIN",
    "type": "string",  ← Should be "string"
    "isString": true
  }
}
```

---

## 📝 Migration Checklist

When adding new features that use roles:

- [ ] Controllers: Type user as `{ id: string; role: RoleName }`
- [ ] Services: Accept `role: RoleName`, not `User` entity
- [ ] Never use `user.role.name` in controllers/services
- [ ] Use `user.role === RoleName.ADMIN` for comparisons
- [ ] Import and use `RoleName` enum
- [ ] Test with fresh JWT token after code changes

---

## 🔍 Troubleshooting

### Issue: 500 Error on Protected Routes

**Cause:** Trying to access `user.role.name` when `user.role` is already a string.

**Solution:**
1. Check if controller is using `@CurrentUser() user: any`
2. Change to `@CurrentUser() user: { id: string; role: RoleName }`
3. Use `user.role` directly, not `user.role.name`

### Issue: Type Error on role Parameter

**Cause:** Passing `string` to method expecting `RoleName`.

**Solution:**
```typescript
// Type the parameter correctly
function method(role: RoleName) {  // Not just 'string'
  // ...
}
```

### Issue: Old Token Still Has Wrong Structure

**Cause:** JWT was created before code changes.

**Solution:** Login again to get a new token with updated payload structure.

---

## 🎓 Summary

| Context | Role Type | Usage |
|---------|-----------|-------|
| **Database (User entity)** | `Role` object | `user.role.name` |
| **JWT Payload** | `string` | `{ role: "ADMIN" }` |
| **Request.user** | `RoleName` | `user.role === RoleName.ADMIN` |
| **Controllers** | `RoleName` | Type param as `{ role: RoleName }` |
| **Services** | `RoleName` | Accept `role: RoleName` parameter |
| **Guards** | `RoleName` | Direct string comparison |

**Golden Rule:** 
- **Extract** role string at authentication boundaries (Auth Service, JWT Strategy)
- **Use** role string everywhere else (Controllers, Services, Guards)
- **Never** access `.role.name` except when extracting from database entity
