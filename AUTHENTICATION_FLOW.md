# Authentication Flow Documentation

## Overview

The FarmaAPK backend implements a JWT-based authentication system with role-based access control (RBAC). The system uses access tokens for authentication and refresh tokens for token renewal, following security best practices.

## Technology Stack

- **Framework**: NestJS
- **Authentication Strategy**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Token Management**: @nestjs/jwt, passport-jwt
- **Validation**: class-validator

## Architecture Components

### 1. Auth Module (`src/modules/auth/`)

- **AuthController**: Handles HTTP requests for authentication endpoints
- **AuthService**: Contains business logic for authentication operations
- **JwtStrategy**: Passport strategy for validating JWT tokens
- **DTOs**: Data transfer objects for request validation

### 2. Guards (`src/common/guards/`)

- **JwtAuthGuard**: Protects routes requiring authentication
- **RolesGuard**: Enforces role-based access control

### 3. Decorators (`src/common/decorators/`)

- **@CurrentUser()**: Extracts authenticated user from request
- **@Roles()**: Specifies required roles for route access

## User Roles

```typescript
enum RoleName {
  ADMIN = 'ADMIN',
  BUSINESS = 'BUSINESS'
}
```

- **ADMIN**: Full system access and administrative privileges
- **BUSINESS**: Business user with limited access (default role)

## Authentication Endpoints

### Base URL: `/auth`

| Endpoint | Method | Authentication | Description |
|----------|--------|----------------|-------------|
| `/auth/register` | POST | None | Register new user |
| `/auth/login` | POST | None | Login existing user |
| `/auth/refresh` | POST | None | Refresh access token |
| `/auth/logout` | POST | Required | Logout user |

---

## 1. Registration Flow

### Endpoint: `POST /auth/register`

**Request Body (RegisterDto):**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "address": "123 Main St",
  "businessName": "ABC Pharma",
  "gstNumber": "GST123456",
  "role": "BUSINESS"
}
```

**Required Fields:**
- `email` (valid email format)
- `password` (minimum 8 characters)
- `fullName`

**Optional Fields:**
- `phone`
- `address`
- `businessName`
- `gstNumber`
- `role` (defaults to `BUSINESS` if not provided)

**Process:**

1. Validate incoming data using RegisterDto
2. Hash password using bcrypt (salt rounds from `BCRYPT_SALT_ROUNDS` config)
3. Create user in database via UsersService
4. Generate access token and refresh token
5. Hash and store refresh token in database
6. Return sanitized user data with tokens

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": {
      "id": "uuid",
      "name": "BUSINESS"
    },
    "isActive": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Handling:**
- Duplicate email returns appropriate error
- Validation errors return 400 Bad Request
- Server errors return 500 Internal Server Error (with details in development mode)

---

## 2. Login Flow

### Endpoint: `POST /auth/login`

**Request Body (LoginDto):**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Process:**

1. Validate incoming credentials
2. Find user by email (including password hash)
3. Check if user exists and is active
4. Compare provided password with stored hash using bcrypt
5. Generate new access token and refresh token
6. Hash and store new refresh token
7. Return sanitized user data with tokens

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": {
      "id": "uuid",
      "name": "BUSINESS"
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**
- Invalid credentials (wrong email or password): `401 Unauthorized`
- Inactive user: `401 Unauthorized`

---

## 3. Token Refresh Flow

### Endpoint: `POST /auth/refresh`

**Request Body (RefreshTokenDto):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Process:**

1. Verify refresh token signature and expiration
2. Extract payload (userId, email, role)
3. Find user by ID with stored refresh token hash
4. Check if user is active
5. Compare provided refresh token with stored hash
6. Generate new access token and refresh token
7. Hash and store new refresh token
8. Return new tokens

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**
- Invalid or expired refresh token: `401 Unauthorized`
- Token mismatch with stored hash: `401 Unauthorized`
- User not found or inactive: `401 Unauthorized`

---

## 4. Logout Flow

### Endpoint: `POST /auth/logout`

**Authentication Required:** Yes (JwtAuthGuard)

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Process:**

1. Extract user ID from JWT payload
2. Remove refresh token hash from database (set to null)
3. Return success response

**Response:**

```json
{
  "success": true
}
```

**Note:** Client must manually delete tokens from storage

---

## JWT Token Structure

### Access Token Payload:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "BUSINESS",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Refresh Token Payload:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "BUSINESS",
  "iat": 1234567890,
  "exp": 1235177890
}
```

**Token Generation Details:**
- Signed using HS256 algorithm
- Access token: shorter expiration (from `JWT_EXPIRES_IN` config)
- Refresh token: longer expiration (from `JWT_REFRESH_EXPIRES_IN` config)
- Separate secrets for access and refresh tokens

---

## Protected Routes Implementation

### Using JwtAuthGuard

Protect routes that require authentication:

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: any) {
  return user;
}
```

### Using Role-Based Access Control

Restrict routes to specific roles:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Get('admin-only')
adminOnly() {
  return { message: 'Admin access granted' };
}
```

### Multiple Roles

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.BUSINESS)
@Get('business-access')
businessAccess() {
  return { message: 'Business access granted' };
}
```

---

## JWT Strategy Validation

The `JwtStrategy` is automatically invoked when a protected route is accessed:

1. Extract JWT from `Authorization: Bearer <token>` header
2. Verify token signature using `JWT_SECRET`
3. Check token expiration
4. Extract payload (sub, email, role)
5. Find user in database by ID
6. Verify user is active
7. Attach user object to request

**User Object Attached to Request:**

```typescript
{
  id: "user-uuid",
  email: "user@example.com",
  role: "BUSINESS"
}
```

---

## Guards Execution Order

When multiple guards are applied:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
```

**Execution Order:**
1. **JwtAuthGuard**: Validates JWT and attaches user to request
2. **RolesGuard**: Checks if user's role matches required roles

If any guard fails, request is rejected with `403 Forbidden`

---

## Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your-access-token-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=12
```

**Security Recommendations:**
- Use strong, random secrets (minimum 32 characters)
- Different secrets for access and refresh tokens
- Keep secrets secure and never commit to version control
- Rotate secrets periodically
- Use environment-specific secrets

---

## Security Features

### 1. Password Security
- **Bcrypt hashing** with configurable salt rounds (default: 12)
- Minimum password length: 8 characters
- Passwords never returned in responses

### 2. Token Security
- **Separate secrets** for access and refresh tokens
- **Short-lived access tokens** (typically 15 minutes)
- **Longer-lived refresh tokens** (typically 7 days)
- **Refresh token rotation** on each refresh request
- Refresh tokens hashed before storage

### 3. User Status Validation
- Active status checked on login and token validation
- Inactive users cannot authenticate

### 4. Request Validation
- DTOs with class-validator ensure data integrity
- Email format validation
- Role enum validation

### 5. Error Handling
- Generic error messages to prevent information disclosure
- Detailed logs for debugging (server-side only)
- Different error messages in development vs. production

---

## Client-Side Implementation Guide

### 1. Registration

```javascript
const register = async (userData) => {
  const response = await fetch('http://api.example.com/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data.user;
};
```

### 2. Login

```javascript
const login = async (email, password) => {
  const response = await fetch('http://api.example.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data.user;
};
```

### 3. Making Authenticated Requests

```javascript
const fetchProtectedData = async () => {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch('http://api.example.com/protected-route', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshAccessToken();
    // Retry original request
    return fetchProtectedData();
  }
  
  return response.json();
};
```

### 4. Token Refresh

```javascript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('http://api.example.com/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  if (!response.ok) {
    // Refresh token invalid, redirect to login
    logout();
    window.location.href = '/login';
    return;
  }
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
};
```

### 5. Logout

```javascript
const logout = async () => {
  const accessToken = localStorage.getItem('accessToken');
  
  await fetch('http://api.example.com/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
};
```

---

## Common Issues and Troubleshooting

### Issue 1: "401 Unauthorized" on Protected Routes

**Possible Causes:**
- Access token expired
- Token not included in Authorization header
- Invalid token format

**Solution:**
- Ensure Bearer token format: `Authorization: Bearer <token>`
- Implement automatic token refresh on 401 responses
- Check token expiration before making requests

### Issue 2: Refresh Token Always Invalid

**Possible Causes:**
- Refresh token expired
- User logged out (refresh token hash removed)
- Token mismatch

**Solution:**
- Redirect user to login page
- Clear stored tokens
- User must login again

### Issue 3: "403 Forbidden" on Admin Routes

**Possible Causes:**
- User doesn't have required role
- RolesGuard not properly configured

**Solution:**
- Verify user role in token payload
- Ensure JwtAuthGuard is applied before RolesGuard
- Check @Roles decorator has correct role names

### Issue 4: Password Hashing Takes Too Long

**Possible Causes:**
- BCRYPT_SALT_ROUNDS too high

**Solution:**
- Reduce salt rounds (10-12 recommended)
- Consider async hashing in production
- Monitor server performance

---

## Best Practices

1. **Token Storage:**
   - Use httpOnly cookies for better security (alternative to localStorage)
   - Never store tokens in session storage for persistent auth
   - Clear tokens on logout

2. **Token Expiration:**
   - Keep access tokens short-lived (15-30 minutes)
   - Refresh tokens can be longer (7-30 days)
   - Implement automatic token refresh

3. **Error Handling:**
   - Don't expose sensitive information in error messages
   - Log authentication failures for security monitoring
   - Implement rate limiting on auth endpoints

4. **Role Management:**
   - Assign roles during registration
   - Validate roles on every protected request
   - Use role hierarchy if needed

5. **Security Headers:**
   - Implement CORS properly
   - Use HTTPS in production
   - Enable helmet.js for security headers

---

## Flow Diagrams

### Registration Flow
```
Client                    Server                  Database
  |                         |                         |
  |--- POST /auth/register->|                         |
  |                         |--- Validate DTO ------>|
  |                         |--- Hash Password ----->|
  |                         |--- Create User ------->|
  |                         |                         |--- Store User
  |                         |<-- User Created --------|
  |                         |--- Generate Tokens --->|
  |                         |--- Store Refresh Hash->|
  |<-- User + Tokens -------|                         |
  |                         |                         |
```

### Login Flow
```
Client                    Server                  Database
  |                         |                         |
  |--- POST /auth/login --->|                         |
  |                         |--- Find User --------->|
  |                         |<-- User + Password hash-|
  |                         |--- Verify Password --->|
  |                         |--- Generate Tokens --->|
  |                         |--- Store Refresh Hash->|
  |<-- User + Tokens -------|                         |
  |                         |                         |
```

### Protected Request Flow
```
Client                    Server                  Database
  |                         |                         |
  |--- GET /protected ----->|                         |
  | (Bearer Token)          |                         |
  |                         |--- Verify JWT -------->|
  |                         |--- Find User --------->|
  |                         |<-- User Data -----------|
  |                         |--- Check Active ------>|
  |                         |--- Execute Handler --->|
  |<-- Response ------------|                         |
  |                         |                         |
```

---

## Summary

The FarmaAPK authentication system provides a robust, secure implementation of JWT-based authentication with the following key features:

- ✅ Secure password hashing with bcrypt
- ✅ JWT access and refresh token mechanism
- ✅ Role-based access control (RBAC)
- ✅ Automatic token validation via Passport strategy
- ✅ User status validation (active/inactive)
- ✅ Comprehensive error handling
- ✅ Clean separation of concerns (Controller → Service → Repository)
- ✅ Request validation with DTOs
- ✅ Configurable security parameters

This implementation follows NestJS and industry best practices for authentication and authorization.
