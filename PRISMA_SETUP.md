# Prisma Setup Documentation

## 📁 File Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Database seeder
├── src/lib/
│   ├── prisma.ts         # Prisma Client Singleton
│   ├── prisma-helpers.ts # Prisma utility helpers
│   └── env.ts            # Environment variables helper
├── .env                  # Environment variables (local)
└── .env.example          # Environment template
```

## 🚀 Quick Start

### 1. Setup Database

```bash
# Copy environment template
cp .env.example .env

# Edit .env dan sesuaikan DATABASE_URL
# DATABASE_URL="postgresql://user:password@localhost:5432/family_tracker"
```

### 2. Generate Prisma Client

```bash
pnpm db:generate
```

### 3. Push Schema ke Database

```bash
# Development (tanpa migrations)
pnpm db:push

# Production (dengan migrations)
pnpm db:migrate
```

### 4. Seed Database dengan Data Demo

```bash
pnpm db:seed
```

### 5. Buka Prisma Studio

```bash
pnpm db:studio
```

## 📊 Database Models

### Core Models

- **User** - Pengguna dengan role ADMIN/MEMBER
- **Family** - Keluarga dengan multiple users
- **Wallet** - Dompet/rekening keluarga
- **Category** - Kategori transaksi custom per family
- **Transaction** - Transaksi (INCOME/EXPENSE/TRANSFER)

### Asset Management

- **Asset** - Aset keluarga (properti, kendaraan, investasi)
- **Liability** - Hutang/kewajiban
- **LiabilityPayment** - Pembayaran cicilan

### Family Features

- **FamilyInvite** - Undangan anggota keluarga
- **Goal** - Target keuangan bersama
- **GoalContribution** - Kontribusi ke goal
- **GoalDistribution** - Distribusi dana goal

### Budgeting

- **Budget** - Budget per kategori

### Audit

- **AuditLog** - Log perubahan data

## 💡 Usage Examples

### Import Prisma Client

```typescript
import { prisma } from "@/lib/prisma";

// Query example
const users = await prisma.user.findMany({
  where: { familyId: "family-id" },
  select: safeUserSelect, // Exclude password
});
```

### Using Helpers

```typescript
import {
  PrismaErrorHandler,
  getPaginationParams,
  createPaginatedResult,
  getCurrentMonthRange,
} from "@/lib/prisma-helpers";

// Error handling
try {
  await prisma.user.create({ data });
} catch (error) {
  const { message, code } = PrismaErrorHandler.handle(error);
  return { error: message };
}

// Pagination
const { page, limit, skip, take } = getPaginationParams({ page: 1, limit: 10 });

const [data, total] = await Promise.all([
  prisma.transaction.findMany({ skip, take }),
  prisma.transaction.count(),
]);

const result = createPaginatedResult(data, total, page, limit);

// Date range filter
const monthRange = getCurrentMonthRange();

const transactions = await prisma.transaction.findMany({
  where: {
    date: {
      gte: monthRange.from,
      lte: monthRange.to,
    },
  },
});
```

### Using Environment Variables

```typescript
import { env } from "@/lib/env";

// Type-safe environment access
const jwtSecret = env.jwt.secret;
const appUrl = env.app.url;
const isDev = env.app.isDevelopment;
```

## 🔐 Demo Credentials (after seeding)

```
Admin:
  Email: admin@demo.com
  Password: admin123

Member:
  Email: member@demo.com
  Password: admin123
```

## 📝 Available Scripts

```json
{
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:seed": "tsx prisma/seed.ts"
}
```

## 🔗 Relations Overview

```
Family
├── Users (many)
├── Wallets (many)
├── Categories (many)
├── Transactions (many)
├── Assets (many)
├── Liabilities (many)
├── Goals (many)
├── Budgets (many)
└── FamilyInvites (many)

User
├── Family (one)
├── Transactions (many)
├── GoalContributions (many)
└── AuditLogs (many)

Transaction
├── Family (one)
├── User (one)
├── Category (one)
├── FromWallet (one)
└── ToWallet (one)
```

## ⚠️ Important Notes

1. **Singleton Pattern**: `prisma.ts` menggunakan singleton untuk menghindari multiple connections di development
2. **Safe User Select**: Gunakan `safeUserSelect` untuk exclude password dari query
3. **Error Handling**: Selalu gunakan `PrismaErrorHandler` untuk user-friendly error messages
4. **Pagination**: Gunakan helper functions untuk consistent pagination
5. **Date Filters**: Gunakan `getDateRangeFilter()` untuk filter berdasarkan tanggal

## 🎯 Next Steps

1. Setup PostgreSQL database lokal atau cloud
2. Update `.env` dengan credentials yang benar
3. Run migrations: `pnpm db:push`
4. Seed demo data: `pnpm db:seed`
5. Start developing! 🚀
