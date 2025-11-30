# 🚀 Quick Start Guide - Financial Family Tracking

## Cara Running Aplikasi

### Prerequisites

Pastikan Anda sudah menginstall:

- **Node.js** 18+ (Recommended: v20)
- **pnpm** (Package Manager)
- **PostgreSQL** 14+ (Database)
- **Git** (Version Control)

### 1. Clone Repository

```bash
git clone https://github.com/imamnura/financial-family-tracking.git
cd financial-family-tracking
```

### 2. Install Dependencies

```bash
# Install pnpm (jika belum ada)
npm install -g pnpm

# Install dependencies
pnpm install
```

### 3. Setup Database

#### Option A: PostgreSQL Lokal

**Install PostgreSQL:**

**MacOS:**

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download dari https://www.postgresql.org/download/windows/

**Buat Database:**

```bash
# Login ke PostgreSQL
psql postgres

# Buat database
CREATE DATABASE family_finance;

# Buat user (opsional)
CREATE USER family_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE family_finance TO family_user;

# Exit
\q
```

#### Option B: Database Cloud (Gratis)

**Supabase (Recommended):**

1. Buka https://supabase.com
2. Sign up / Login
3. Create New Project
4. Tunggu provisioning selesai
5. Buka Settings > Database
6. Copy **Connection String** (pilih mode: Connection pooling)

**Railway:**

1. Buka https://railway.app
2. New Project > Deploy PostgreSQL
3. Copy **DATABASE_URL** dari Variables

**Neon:**

1. Buka https://neon.tech
2. Create Project
3. Copy **Connection String**

### 4. Environment Variables

Buat file `.env` di root folder:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database (REQUIRED)
# Untuk lokal:
DATABASE_URL="postgresql://family_user:your_password@localhost:5432/family_finance?schema=public"

# Atau untuk cloud (Supabase/Railway/Neon):
# DATABASE_URL="postgresql://user:pass@host:5432/database?schema=public"

# Authentication (REQUIRED)
JWT_SECRET="your-super-secret-key-minimum-32-characters-long-change-this"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (OPTIONAL - akan menggunakan Ethereal untuk testing jika tidak diisi)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@familyfinance.app"
```

**Generate JWT Secret:**

```bash
# Cara 1: OpenSSL
openssl rand -base64 32

# Cara 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Cara 3: Online
# https://generate-secret.now.sh/32
```

### 5. Setup Prisma & Database

```bash
# Generate Prisma Client
pnpm run db:generate

# Push schema ke database (untuk development)
pnpm run db:push

# Atau migrate (untuk production)
pnpm run db:migrate

# Seed data sample (opsional)
pnpm run db:seed
```

**Output yang benar:**

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "family_finance"

🚀  Your database is now in sync with your Prisma schema.
✔ Generated Prisma Client
```

### 6. Run Development Server

```bash
pnpm dev
```

Buka browser: **http://localhost:3000**

**Output yang benar:**

```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000

✓ Ready in 2.3s
```

---

## 📊 Cara Menambahkan Data via Prisma

### 1. Via Prisma Studio (GUI - Recommended)

```bash
pnpm run db:studio
```

Browser akan terbuka di **http://localhost:5555**

**Cara Menggunakan:**

1. Pilih model (contoh: User)
2. Klik "Add record"
3. Isi data
4. Klik "Save changes"

**Tips:**

- Gunakan Prisma Studio untuk melihat data secara visual
- Bisa edit, delete, dan filter data
- Real-time update

### 2. Via Seed Script

Edit file `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hapus data lama (opsional)
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.category.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.family.deleteMany();
  await prisma.user.deleteMany();

  // 1. Buat User
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user1 = await prisma.user.create({
    data: {
      email: "john@example.com",
      name: "John Doe",
      password: hashedPassword,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "jane@example.com",
      name: "Jane Doe",
      password: hashedPassword,
    },
  });

  console.log("✅ Created users:", user1.email, user2.email);

  // 2. Buat Family
  const family = await prisma.family.create({
    data: {
      name: "Doe Family",
      currency: "IDR",
    },
  });

  console.log("✅ Created family:", family.name);

  // 3. Tambahkan Family Members
  await prisma.familyMember.createMany({
    data: [
      {
        familyId: family.id,
        userId: user1.id,
        role: "ADMIN",
      },
      {
        familyId: family.id,
        userId: user2.id,
        role: "MEMBER",
      },
    ],
  });

  console.log("✅ Added family members");

  // 4. Buat Categories
  const categories = await prisma.category.createMany({
    data: [
      {
        name: "Makanan & Minuman",
        type: "EXPENSE",
        icon: "🍔",
        color: "#ef4444",
        familyId: family.id,
      },
      {
        name: "Transport",
        type: "EXPENSE",
        icon: "🚗",
        color: "#f59e0b",
        familyId: family.id,
      },
      {
        name: "Belanja",
        type: "EXPENSE",
        icon: "🛒",
        color: "#8b5cf6",
        familyId: family.id,
      },
      {
        name: "Tagihan",
        type: "EXPENSE",
        icon: "💳",
        color: "#ef4444",
        familyId: family.id,
      },
      {
        name: "Hiburan",
        type: "EXPENSE",
        icon: "🎮",
        color: "#ec4899",
        familyId: family.id,
      },
      {
        name: "Gaji",
        type: "INCOME",
        icon: "💰",
        color: "#10b981",
        familyId: family.id,
      },
      {
        name: "Bonus",
        type: "INCOME",
        icon: "🎁",
        color: "#10b981",
        familyId: family.id,
      },
      {
        name: "Investasi",
        type: "INCOME",
        icon: "📈",
        color: "#10b981",
        familyId: family.id,
      },
    ],
  });

  console.log("✅ Created categories");

  // 5. Buat Wallets
  const wallet1 = await prisma.wallet.create({
    data: {
      name: "BCA",
      type: "BANK_ACCOUNT",
      balance: 10000000,
      currency: "IDR",
      icon: "🏦",
      color: "#2563eb",
      familyId: family.id,
    },
  });

  const wallet2 = await prisma.wallet.create({
    data: {
      name: "Cash",
      type: "CASH",
      balance: 2000000,
      currency: "IDR",
      icon: "💵",
      color: "#10b981",
      familyId: family.id,
    },
  });

  console.log("✅ Created wallets");

  // 6. Buat Transactions
  const categoryFood = await prisma.category.findFirst({
    where: { name: "Makanan & Minuman" },
  });
  const categorySalary = await prisma.category.findFirst({
    where: { name: "Gaji" },
  });

  await prisma.transaction.createMany({
    data: [
      {
        type: "INCOME",
        amount: 5000000,
        description: "Gaji Bulan Januari",
        date: new Date("2024-01-01"),
        categoryId: categorySalary!.id,
        walletId: wallet1.id,
        userId: user1.id,
        familyId: family.id,
      },
      {
        type: "EXPENSE",
        amount: 150000,
        description: "Makan siang di restoran",
        date: new Date("2024-01-05"),
        categoryId: categoryFood!.id,
        walletId: wallet2.id,
        userId: user1.id,
        familyId: family.id,
      },
      {
        type: "EXPENSE",
        amount: 200000,
        description: "Belanja groceries",
        date: new Date("2024-01-10"),
        categoryId: categoryFood!.id,
        walletId: wallet2.id,
        userId: user2.id,
        familyId: family.id,
      },
    ],
  });

  console.log("✅ Created transactions");

  // 7. Buat Budget
  await prisma.budget.create({
    data: {
      name: "Budget Januari",
      month: "2024-01",
      totalBudget: 3000000,
      userId: user1.id,
      familyId: family.id,
      categories: {
        create: [{ categoryId: categoryFood!.id, amount: 1500000 }],
      },
    },
  });

  console.log("✅ Created budget");

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run seed:**

```bash
pnpm run db:seed
```

### 3. Via API (Postman/Thunder Client)

**Login dulu untuk dapat token:**

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx...",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Buat Transaction:**

```bash
POST http://localhost:3000/api/transactions
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "type": "EXPENSE",
  "amount": 50000,
  "description": "Kopi pagi",
  "date": "2024-01-15",
  "categoryId": "clx...",
  "walletId": "clx..."
}
```

---

## 🎬 Data Sample untuk Demo

### Skenario: Keluarga Budi

```typescript
// File: prisma/seed-demo.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function demoSeed() {
  console.log("🎬 Creating demo data for Budi Family...");

  const password = await bcrypt.hash("demo123", 10);

  // 1. Buat Users
  const budi = await prisma.user.create({
    data: { email: "budi@demo.com", name: "Budi Santoso", password },
  });

  const ani = await prisma.user.create({
    data: { email: "ani@demo.com", name: "Ani Santoso", password },
  });

  // 2. Buat Family
  const family = await prisma.family.create({
    data: {
      name: "Keluarga Budi",
      currency: "IDR",
      members: {
        create: [
          { userId: budi.id, role: "ADMIN" },
          { userId: ani.id, role: "MEMBER" },
        ],
      },
    },
  });

  // 3. Categories
  const categories = {
    food: await prisma.category.create({
      data: {
        name: "Makanan",
        type: "EXPENSE",
        icon: "🍔",
        color: "#ef4444",
        familyId: family.id,
      },
    }),
    transport: await prisma.category.create({
      data: {
        name: "Transport",
        type: "EXPENSE",
        icon: "🚗",
        color: "#f59e0b",
        familyId: family.id,
      },
    }),
    salary: await prisma.category.create({
      data: {
        name: "Gaji",
        type: "INCOME",
        icon: "💰",
        color: "#10b981",
        familyId: family.id,
      },
    }),
  };

  // 4. Wallets
  const wallets = {
    bca: await prisma.wallet.create({
      data: {
        name: "BCA - Budi",
        type: "BANK_ACCOUNT",
        balance: 15000000,
        currency: "IDR",
        icon: "🏦",
        color: "#2563eb",
        familyId: family.id,
      },
    }),
    cash: await prisma.wallet.create({
      data: {
        name: "Dompet Cash",
        type: "CASH",
        balance: 1500000,
        currency: "IDR",
        icon: "💵",
        color: "#10b981",
        familyId: family.id,
      },
    }),
  };

  // 5. Transactions (30 hari terakhir)
  const transactions = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Income setiap tanggal 1
    if (i === 0) {
      transactions.push({
        type: "INCOME",
        amount: 10000000,
        description: "Gaji Bulanan",
        date,
        categoryId: categories.salary.id,
        walletId: wallets.bca.id,
        userId: budi.id,
        familyId: family.id,
      });
    }

    // Random expenses
    if (i % 2 === 0) {
      transactions.push({
        type: "EXPENSE",
        amount: Math.floor(Math.random() * 200000) + 50000,
        description: "Belanja harian",
        date,
        categoryId: categories.food.id,
        walletId: wallets.cash.id,
        userId: Math.random() > 0.5 ? budi.id : ani.id,
        familyId: family.id,
      });
    }

    if (i % 3 === 0) {
      transactions.push({
        type: "EXPENSE",
        amount: Math.floor(Math.random() * 100000) + 20000,
        description: "Bensin/Transportasi",
        date,
        categoryId: categories.transport.id,
        walletId: wallets.cash.id,
        userId: budi.id,
        familyId: family.id,
      });
    }
  }

  await prisma.transaction.createMany({ data: transactions });

  // 6. Budget
  const currentMonth = new Date().toISOString().slice(0, 7);
  await prisma.budget.create({
    data: {
      name: `Budget ${currentMonth}`,
      month: currentMonth,
      totalBudget: 5000000,
      userId: budi.id,
      familyId: family.id,
      categories: {
        create: [
          { categoryId: categories.food.id, amount: 3000000 },
          { categoryId: categories.transport.id, amount: 2000000 },
        ],
      },
    },
  });

  console.log("✅ Demo data created!");
  console.log("📧 Login credentials:");
  console.log("   Email: budi@demo.com");
  console.log("   Password: demo123");
}

demoSeed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run demo seed:**

```bash
npx tsx prisma/seed-demo.ts
```

---

## 🔧 Troubleshooting

### Error: "Can't reach database server"

**Solusi:**

```bash
# Check PostgreSQL status
brew services list  # MacOS
systemctl status postgresql  # Linux

# Restart PostgreSQL
brew services restart postgresql@16  # MacOS
sudo systemctl restart postgresql  # Linux
```

### Error: "Database does not exist"

**Solusi:**

```bash
# Buat database manual
psql postgres -c "CREATE DATABASE family_finance;"

# Atau via Prisma
pnpm run db:push
```

### Error: "Invalid JWT Secret"

**Solusi:**
Pastikan `JWT_SECRET` di `.env` minimal 32 karakter.

### Error: "Port 3000 already in use"

**Solusi:**

```bash
# Ganti port
PORT=3001 pnpm dev

# Atau kill process
lsof -ti:3000 | xargs kill -9  # MacOS/Linux
```

---

## 📱 Login Credentials (Setelah Seed)

### Demo Account

- **Email**: `budi@demo.com`
- **Password**: `demo123`
- **Role**: Admin (full access)

### Demo Account 2

- **Email**: `ani@demo.com`
- **Password**: `demo123`
- **Role**: Member

### Development Account

- **Email**: `john@example.com`
- **Password**: `password123`

---

## 🎯 Next Steps

1. ✅ Buat akun baru via `/login` (klik "Daftar")
2. ✅ Buat family di halaman profile
3. ✅ Undang anggota keluarga
4. ✅ Buat kategori & wallet
5. ✅ Catat transaksi pertama
6. ✅ Set budget bulanan
7. ✅ Lihat dashboard analytics

---

## 📚 Useful Commands

```bash
# Development
pnpm dev              # Run dev server
pnpm build            # Build for production
pnpm start            # Run production server
pnpm lint             # Run ESLint

# Database
pnpm db:generate      # Generate Prisma Client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database

# TypeScript
npx tsc --noEmit      # Check TypeScript errors

# Reset Database (hati-hati!)
pnpm db:reset         # Reset database & run migrations
```

---

## 💡 Tips

1. **Gunakan Prisma Studio** untuk explore data secara visual
2. **Seed data** setiap kali reset database untuk testing
3. **Backup database** sebelum experiment
4. **Gunakan Git** untuk version control
5. **Test API** dengan Thunder Client (VSCode extension)

---

**Happy Coding! 🚀**
