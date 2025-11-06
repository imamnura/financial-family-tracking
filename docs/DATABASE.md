# 📊 Database Schema Documentation

## Overview

Database menggunakan **PostgreSQL** dengan **Prisma ORM** untuk type-safe database access.

---

## Database Diagram

```
┌─────────────┐
│   Family    │
├─────────────┤
│ id          │◄──────────┐
│ name        │           │
│ description │           │
└─────────────┘           │
       ▲                  │
       │                  │
       │                  │
┌──────┴────────┐    ┌────┴──────┐
│     User      │    │  Wallet   │
├───────────────┤    ├───────────┤
│ id            │    │ id        │
│ email         │    │ name      │
│ name          │    │ type      │
│ password      │    │ balance   │
│ role          │    │ familyId  │
│ familyId      │    └───────────┘
└───────────────┘          ▲
       ▲                   │
       │                   │
       │            ┌──────┴─────────┐
┌──────┴──────────┐ │  Transaction  │
│   Category      │ ├────────────────┤
├─────────────────┤ │ id             │
│ id              │◄┤ amount         │
│ name            │ │ type           │
│ type            │ │ description    │
│ icon            │ │ userId         │
│ color           │ │ categoryId     │
│ familyId        │ │ fromWalletId   │
└─────────────────┘ │ toWalletId     │
                    │ familyId       │
                    └────────────────┘
```

---

## Tables

### User

Pengguna aplikasi dengan role-based access.

| Field     | Type     | Description              |
| --------- | -------- | ------------------------ |
| id        | String   | Primary key (CUID)       |
| email     | String   | Email (unique)           |
| name      | String   | Nama lengkap             |
| password  | String   | Hashed password (bcrypt) |
| role      | Enum     | ADMIN / MEMBER           |
| avatar    | String?  | URL avatar image         |
| familyId  | String?  | Foreign key ke Family    |
| createdAt | DateTime | Timestamp created        |
| updatedAt | DateTime | Timestamp updated        |

**Indexes:**

- `email` (unique)
- `familyId`

**Relations:**

- `family` (many-to-one with Family)
- `transactions` (one-to-many with Transaction)
- `assets` (one-to-many with Asset)
- `liabilities` (one-to-many with Liability)
- `budgets` (one-to-many with Budget)

---

### Family

Keluarga yang dapat memiliki multiple users.

| Field       | Type     | Description        |
| ----------- | -------- | ------------------ |
| id          | String   | Primary key (CUID) |
| name        | String   | Nama keluarga      |
| description | String?  | Deskripsi keluarga |
| createdAt   | DateTime | Timestamp created  |
| updatedAt   | DateTime | Timestamp updated  |

**Relations:**

- `members` (one-to-many with User)
- `wallets` (one-to-many with Wallet)
- `categories` (one-to-many with Category)
- `transactions` (one-to-many with Transaction)
- `assets` (one-to-many with Asset)
- `liabilities` (one-to-many with Liability)
- `goals` (one-to-many with Goal)
- `budgets` (one-to-many with Budget)

---

### Wallet

Dompet/rekening untuk menyimpan dana.

| Field       | Type     | Description                    |
| ----------- | -------- | ------------------------------ |
| id          | String   | Primary key (CUID)             |
| name        | String   | Nama wallet (e.g., "BCA Ayah") |
| type        | String   | BANK / E_WALLET / CASH         |
| balance     | Float    | Saldo saat ini                 |
| description | String?  | Deskripsi                      |
| icon        | String?  | Icon identifier                |
| color       | String?  | Hex color untuk UI             |
| familyId    | String   | Foreign key ke Family          |
| createdAt   | DateTime | Timestamp created              |
| updatedAt   | DateTime | Timestamp updated              |

**Indexes:**

- `familyId`

**Relations:**

- `family` (many-to-one with Family)
- `transactionsFrom` (one-to-many with Transaction)
- `transactionsTo` (one-to-many with Transaction)

---

### Category

Kategori transaksi custom per keluarga.

| Field       | Type            | Description           |
| ----------- | --------------- | --------------------- |
| id          | String          | Primary key (CUID)    |
| name        | String          | Nama kategori         |
| type        | TransactionType | INCOME / EXPENSE      |
| icon        | String?         | Icon identifier       |
| color       | String?         | Hex color             |
| description | String?         | Deskripsi             |
| familyId    | String          | Foreign key ke Family |
| createdAt   | DateTime        | Timestamp created     |
| updatedAt   | DateTime        | Timestamp updated     |

**Indexes:**

- `familyId`
- Unique constraint: `[familyId, name, type]`

**Relations:**

- `family` (many-to-one with Family)
- `transactions` (one-to-many with Transaction)
- `budgets` (one-to-many with Budget)

---

### Transaction

Transaksi keuangan (pemasukan/pengeluaran/transfer).

| Field        | Type            | Description             |
| ------------ | --------------- | ----------------------- |
| id           | String          | Primary key (CUID)      |
| amount       | Float           | Jumlah transaksi        |
| type         | TransactionType | INCOME/EXPENSE/TRANSFER |
| description  | String?         | Deskripsi               |
| notes        | String?         | Catatan tambahan        |
| date         | DateTime        | Tanggal transaksi       |
| familyId     | String          | Foreign key ke Family   |
| userId       | String          | Foreign key ke User     |
| categoryId   | String?         | Foreign key ke Category |
| fromWalletId | String?         | Foreign key ke Wallet   |
| toWalletId   | String?         | Foreign key ke Wallet   |
| attachment   | String?         | URL receipt/proof       |
| createdAt    | DateTime        | Timestamp created       |
| updatedAt    | DateTime        | Timestamp updated       |

**Indexes:**

- `familyId`
- `userId`
- `categoryId`
- `date`
- `type`

**Relations:**

- `family` (many-to-one with Family)
- `user` (many-to-one with User)
- `category` (many-to-one with Category)
- `fromWallet` (many-to-one with Wallet)
- `toWallet` (many-to-one with Wallet)

---

### Asset

Aset keluarga (properti, kendaraan, investasi).

| Field         | Type      | Description           |
| ------------- | --------- | --------------------- |
| id            | String    | Primary key (CUID)    |
| name          | String    | Nama aset             |
| type          | AssetType | Type aset             |
| value         | Float     | Nilai saat ini        |
| purchaseValue | Float?    | Nilai beli awal       |
| purchaseDate  | DateTime? | Tanggal pembelian     |
| description   | String?   | Deskripsi             |
| notes         | String?   | Catatan               |
| familyId      | String    | Foreign key ke Family |
| createdById   | String    | Foreign key ke User   |
| createdAt     | DateTime  | Timestamp created     |
| updatedAt     | DateTime  | Timestamp updated     |

**Indexes:**

- `familyId`
- `type`

---

### Liability

Hutang/kewajiban keluarga.

| Field           | Type          | Description           |
| --------------- | ------------- | --------------------- |
| id              | String        | Primary key (CUID)    |
| name            | String        | Nama hutang           |
| type            | LiabilityType | Type hutang           |
| totalAmount     | Float         | Total hutang awal     |
| remainingAmount | Float         | Sisa hutang           |
| interestRate    | Float?        | Bunga (%)             |
| monthlyPayment  | Float?        | Cicilan bulanan       |
| dueDate         | DateTime?     | Jatuh tempo           |
| startDate       | DateTime?     | Tanggal mulai         |
| description     | String?       | Deskripsi             |
| notes           | String?       | Catatan               |
| familyId        | String        | Foreign key ke Family |
| createdById     | String        | Foreign key ke User   |
| createdAt       | DateTime      | Timestamp created     |
| updatedAt       | DateTime      | Timestamp updated     |

**Indexes:**

- `familyId`
- `type`
- `dueDate`

---

### Goal

Target keuangan keluarga.

| Field         | Type       | Description                |
| ------------- | ---------- | -------------------------- |
| id            | String     | Primary key (CUID)         |
| name          | String     | Nama goal                  |
| description   | String?    | Deskripsi                  |
| targetAmount  | Float      | Target dana                |
| currentAmount | Float      | Dana terkumpul             |
| deadline      | DateTime?  | Target waktu               |
| status        | GoalStatus | ACTIVE/COMPLETED/CANCELLED |
| familyId      | String     | Foreign key ke Family      |
| createdAt     | DateTime   | Timestamp created          |
| updatedAt     | DateTime   | Timestamp updated          |

**Indexes:**

- `familyId`
- `status`

---

### Budget

Budget bulanan/tahunan per kategori.

| Field          | Type         | Description             |
| -------------- | ------------ | ----------------------- |
| id             | String       | Primary key (CUID)      |
| name           | String       | Nama budget             |
| amount         | Float        | Jumlah budget           |
| spent          | Float        | Sudah terpakai          |
| period         | BudgetPeriod | MONTHLY / YEARLY        |
| startDate      | DateTime     | Tanggal mulai           |
| endDate        | DateTime     | Tanggal akhir           |
| alertThreshold | Float?       | Alert threshold (%)     |
| familyId       | String       | Foreign key ke Family   |
| categoryId     | String?      | Foreign key ke Category |
| createdById    | String       | Foreign key ke User     |
| createdAt      | DateTime     | Timestamp created       |
| updatedAt      | DateTime     | Timestamp updated       |

**Indexes:**

- `familyId`
- `categoryId`
- `[startDate, endDate]`

---

### AuditLog

Log perubahan data penting.

| Field      | Type     | Description          |
| ---------- | -------- | -------------------- |
| id         | String   | Primary key (CUID)   |
| action     | String   | CREATE/UPDATE/DELETE |
| entityType | String   | Type entity          |
| entityId   | String   | ID entity            |
| dataBefore | String?  | JSON data before     |
| dataAfter  | String?  | JSON data after      |
| ipAddress  | String?  | IP address           |
| userAgent  | String?  | User agent           |
| userId     | String   | Foreign key ke User  |
| createdAt  | DateTime | Timestamp created    |

**Indexes:**

- `userId`
- `[entityType, entityId]`
- `createdAt`

---

## Enums

### Role

```prisma
enum Role {
  ADMIN   // Kepala keluarga
  MEMBER  // Anggota keluarga
}
```

### TransactionType

```prisma
enum TransactionType {
  INCOME   // Pemasukan
  EXPENSE  // Pengeluaran
  TRANSFER // Transfer antar wallet
}
```

### AssetType

```prisma
enum AssetType {
  PROPERTY    // Properti
  VEHICLE     // Kendaraan
  SAVINGS     // Tabungan
  INVESTMENT  // Investasi
  OTHER       // Lainnya
}
```

### LiabilityType

```prisma
enum LiabilityType {
  MORTGAGE       // KPR
  CAR_LOAN       // Kredit kendaraan
  CREDIT_CARD    // Kartu kredit
  PERSONAL_LOAN  // Pinjaman pribadi
  OTHER          // Lainnya
}
```

### InviteStatus

```prisma
enum InviteStatus {
  PENDING   // Menunggu
  ACCEPTED  // Diterima
  REJECTED  // Ditolak
  EXPIRED   // Kadaluarsa
}
```

### GoalStatus

```prisma
enum GoalStatus {
  ACTIVE      // Aktif
  COMPLETED   // Tercapai
  CANCELLED   // Dibatalkan
}
```

### BudgetPeriod

```prisma
enum BudgetPeriod {
  MONTHLY  // Bulanan
  YEARLY   // Tahunan
}
```

---

## Migrations

### Create Migration

```bash
pnpm db:migrate
```

### Push Schema (Development)

```bash
pnpm db:push
```

### Reset Database

```bash
prisma migrate reset
```

---

## Seed Data

Run seeder untuk data demo:

```bash
pnpm db:seed
```

Akan membuat:

- 1 Family: "Keluarga Demo"
- 2 Users: admin@demo.com, member@demo.com
- 3 Wallets: BCA, GoPay, Cash
- 12 Categories (income & expense)
- Sample transactions
- Sample assets, liabilities, goals, budgets

---

## Best Practices

### ✅ Do's

- ✅ Use transactions for related updates
- ✅ Add proper indexes for queries
- ✅ Use Prisma migrations in production
- ✅ Validate data before database operations
- ✅ Use soft delete when needed
- ✅ Backup database regularly

### ❌ Don'ts

- ❌ Expose sensitive fields (password)
- ❌ Skip migrations in production
- ❌ Delete data without backup
- ❌ Use raw SQL without sanitization
- ❌ Forget to add indexes

---

## Backup & Restore

### Backup Database

```bash
pg_dump -U username -d family_tracker > backup.sql
```

### Restore Database

```bash
psql -U username -d family_tracker < backup.sql
```

---

## Performance Tips

1. **Add indexes** untuk field yang sering di-query
2. **Use select** untuk ambil field yang diperlukan saja
3. **Implement pagination** untuk large datasets
4. **Use database transactions** untuk operasi atomic
5. **Cache** frequently accessed data
6. **Optimize queries** dengan Prisma query analyzer

---

## Schema Updates

Saat update schema:

1. Edit `prisma/schema.prisma`
2. Run `pnpm db:generate` untuk update client
3. Run `pnpm db:migrate` untuk create migration
4. Test perubahan di development
5. Deploy migration ke production
