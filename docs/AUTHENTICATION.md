# 🔐 Authentication & Authorization

## Overview

Sistem autentikasi menggunakan **JWT (JSON Web Tokens)** dengan **role-based access control** untuk membedakan Admin dan Member dalam keluarga.

## Features

### ✅ Implemented

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access (ADMIN/MEMBER)
- Prisma integration

### 🚧 In Progress

- Login/Register API
- Protected routes middleware
- Refresh token mechanism

### 📋 Planned

- Two-factor authentication (2FA)
- Email verification
- Password reset
- Session management
- Remember me functionality

---

## User Roles

### ADMIN

- Kepala keluarga (ayah/ibu)
- Full access ke semua fitur
- Dapat invite anggota baru
- Dapat mengelola budget keluarga
- Dapat melihat semua transaksi
- Dapat mengedit/delete data penting

### MEMBER

- Anggota keluarga (pasangan/anak dewasa)
- Dapat menambah transaksi pribadi
- Dapat melihat dashboard keluarga
- Dapat berkontribusi ke goal
- Tidak dapat delete data orang lain
- Tidak dapat invite anggota baru

---

## Database Schema

```prisma
enum Role {
  ADMIN   // Kepala keluarga
  MEMBER  // Anggota keluarga
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // Hashed with bcrypt
  role      Role     @default(MEMBER)
  avatar    String?
  familyId  String?
  family    Family?  @relation(fields: [familyId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## API Endpoints

### POST /api/auth/register

Register user baru

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "familyId": "optional-family-id"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "MEMBER"
  },
  "token": "jwt-token"
}
```

### POST /api/auth/login

Login user

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "familyId": "family-id"
  },
  "token": "jwt-token",
  "refreshToken": "refresh-token"
}
```

### POST /api/auth/logout

Logout user

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/auth/refresh

Refresh access token

**Request Body:**

```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**

```json
{
  "success": true,
  "token": "new-jwt-token"
}
```

### GET /api/auth/me

Get current user info

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "familyId": "family-id",
    "family": {
      "id": "family-id",
      "name": "Keluarga Budi"
    }
  }
}
```

---

## Implementation Guide

### 1. Password Hashing

```typescript
import bcrypt from "bcryptjs";

// Hash password saat register
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password saat login
const isValid = await bcrypt.compare(password, user.password);
```

### 2. JWT Token Generation

```typescript
import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

// Generate access token
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
    familyId: user.familyId,
  },
  env.jwt.secret,
  { expiresIn: env.jwt.expiresIn }
);

// Generate refresh token
const refreshToken = jwt.sign({ userId: user.id }, env.jwt.refreshSecret, {
  expiresIn: env.jwt.refreshExpiresIn,
});
```

### 3. Verify Token

```typescript
import jwt from "jsonwebtoken";

try {
  const decoded = jwt.verify(token, env.jwt.secret);
  // Token valid
} catch (error) {
  // Token invalid atau expired
}
```

### 4. Middleware Protection

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
};
```

### 5. Role-based Access

```typescript
// Check if user is admin
function isAdmin(user: User): boolean {
  return user.role === "ADMIN";
}

// Require admin role
async function requireAdmin(req: Request) {
  const user = await getCurrentUser(req);

  if (!isAdmin(user)) {
    throw new Error("Unauthorized: Admin access required");
  }

  return user;
}
```

---

## Client-side Usage

### React Hook for Auth

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      setUser(data.user);
      return { success: true };
    }

    return { success: false, error: data.error };
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return { user, loading, login, logout, checkAuth };
}
```

### Protected Component

```typescript
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Protected content</div>;
}
```

---

## Security Best Practices

### ✅ Do's

- ✅ Use environment variables for secrets
- ✅ Hash passwords with bcrypt (salt rounds >= 10)
- ✅ Use HTTPS in production
- ✅ Set short expiry for access tokens (7 days)
- ✅ Use httpOnly cookies for tokens
- ✅ Implement refresh token rotation
- ✅ Validate all user inputs
- ✅ Rate limit login attempts

### ❌ Don'ts

- ❌ Store passwords in plain text
- ❌ Expose JWT secret in client code
- ❌ Use weak JWT secrets
- ❌ Store sensitive data in JWT payload
- ❌ Use long expiry times for access tokens
- ❌ Allow unlimited login attempts

---

## Error Handling

```typescript
// Common auth errors
export const AuthErrors = {
  INVALID_CREDENTIALS: "Email atau password salah",
  USER_NOT_FOUND: "User tidak ditemukan",
  EMAIL_ALREADY_EXISTS: "Email sudah terdaftar",
  INVALID_TOKEN: "Token tidak valid",
  TOKEN_EXPIRED: "Token sudah kadaluarsa",
  UNAUTHORIZED: "Anda tidak memiliki akses",
  FORBIDDEN: "Akses ditolak",
} as const;
```

---

## Testing

### Test Cases

```typescript
describe("Authentication", () => {
  it("should register new user", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.token).toBeDefined();
  });

  it("should login with valid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@demo.com",
      password: "admin123",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should reject invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@demo.com",
      password: "wrongpassword",
    });

    expect(response.status).toBe(401);
  });
});
```

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_REFRESH_EXPIRES_IN="30d"

# Cookie Configuration
COOKIE_SECRET="your-cookie-secret-key-change-this-in-production"
COOKIE_SECURE="false" # Set to true in production with HTTPS
COOKIE_MAX_AGE="604800000" # 7 days in milliseconds
```

---

## Next Steps

1. [ ] Implement register API endpoint
2. [ ] Implement login API endpoint
3. [ ] Create middleware for route protection
4. [ ] Add refresh token mechanism
5. [ ] Create auth context/provider
6. [ ] Build login/register UI pages
7. [ ] Add email verification
8. [ ] Implement password reset
9. [ ] Add rate limiting
10. [ ] Add session management
