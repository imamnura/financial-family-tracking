# 🚀 Getting Started - Financial Family Tracking

Quick guide untuk menjalankan aplikasi ini dalam 5 menit!

---

## 📋 Prerequisites

Pastikan sudah terinstall:

- **Node.js** 18+ → [Download](https://nodejs.org/)
- **pnpm** → Install: `npm install -g pnpm`
- **PostgreSQL** → [Download](https://www.postgresql.org/download/) atau gunakan cloud (Supabase/Railway/Neon)

---

## ⚡ Quick Start (5 Menit)

### 1️⃣ Clone & Install

```bash
cd /Users/telkom/project/financial-family-tracking
pnpm install
```

### 2️⃣ Setup Database

**Option A: PostgreSQL Lokal**

```bash
# Install PostgreSQL
brew install postgresql@15  # macOS
sudo apt install postgresql # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql # Ubuntu

# Create database
createdb financial_family_tracking
```

**Option B: Supabase Cloud (Gratis)**

1. Buka [https://supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string dari Settings → Database

**Option C: Railway Cloud (Gratis)**

1. Buka [https://railway.app](https://railway.app)
2. New Project → Provision PostgreSQL
3. Copy connection string

### 3️⃣ Environment Variables

Buat file `.env`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/financial_family_tracking"

# JWT Secret (generate random string)
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

# Email (Optional - untuk testing pakai Ethereal)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT="587"
SMTP_USER="your-ethereal-user"
SMTP_PASS="your-ethereal-pass"
SMTP_FROM="noreply@financialtracking.com"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Upload (Optional)
MAX_FILE_SIZE="10485760"  # 10MB
UPLOAD_DIR="./public/uploads"
```

**Generate JWT Secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Get Ethereal Email (untuk testing):**

1. Buka [https://ethereal.email](https://ethereal.email)
2. Click "Create Ethereal Account"
3. Copy credentials ke `.env`

### 4️⃣ Setup Prisma & Seed Data

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema ke database
pnpm db:push

# Seed dengan demo data
pnpm db:seed:demo
```

**Output seed:**

```
🎉 DEMO DATA SEEDING COMPLETED!

📧 Login Credentials:
   Email: budi@demo.com
   Password: demo123
   Role: Admin (Full Access)

📊 Data Summary:
   • Users: 3
   • Family: 1 (Keluarga Budi)
   • Categories: 10 (Makanan, Transport, dll)
   • Wallets: 4 (BCA, Mandiri, Cash, Dana)
   • Transactions: 150+ (60 hari terakhir)
   • Budget: 1
   • Recurring: 2
   • Templates: 3
```

### 5️⃣ Run Development Server

```bash
pnpm dev
```

Buka browser: **http://localhost:3000**

Login dengan:

- Email: `budi@demo.com`
- Password: `demo123`

---

## 🎯 What's Next?

### Explore Features

1. **Dashboard** - Lihat overview keuangan keluarga
2. **Transaksi** - Tambah/edit transaksi income/expense
3. **Budget** - Atur budget per kategori
4. **Wallet** - Manage multiple wallets (Bank, Cash, E-Wallet)
5. **Laporan** - Export PDF/Excel, visualisasi chart
6. **Family** - Invite member keluarga

### Admin Features (budi@demo.com)

✅ Full access semua fitur
✅ Manage family members
✅ Approve transactions
✅ Configure settings
✅ View analytics

### Member Features (ani@demo.com)

✅ Add transactions
✅ View own transactions
✅ Create budgets
✅ Export reports
❌ Manage family (admin only)

---

## 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm db:generate      # Generate Prisma Client
pnpm db:push          # Push schema (for prototyping)
pnpm db:migrate       # Create migration (for production)
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:seed          # Run seed script
pnpm db:seed:demo     # Run demo seed script
```

---

## 📂 Project Structure

```
financial-family-tracking/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Public routes (login, register)
│   │   ├── (protected)/         # Protected routes (dashboard, etc)
│   │   └── api/                 # API routes
│   ├── components/              # React components
│   ├── lib/                     # Utilities, types, helpers
│   └── stores/                  # Zustand stores
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Main seed script
│   └── seed-demo.ts            # Demo data seed
├── public/                     # Static files
└── docs/                       # Documentation
    ├── QUICK_START.md         # Detailed setup guide
    ├── EMAIL_AND_UPLOAD.md    # Email & upload features
    ├── DEPLOYMENT.md          # Production deployment
    └── 100_PERCENT_COMPLETE.md # Complete feature list
```

---

## 🗄️ Database Management

### Prisma Studio (GUI)

```bash
pnpm db:studio
```

Buka: **http://localhost:5555**

GUI untuk:

- Browse semua tabel
- Add/edit/delete data
- View relationships
- Search & filter

### Manual SQL

```bash
psql -d financial_family_tracking

# Useful queries
SELECT * FROM "User";
SELECT * FROM "Transaction" ORDER BY date DESC LIMIT 10;
SELECT * FROM "Budget" WHERE month = '2025-01';
```

### Reset Database

```bash
# Warning: Deletes all data!
pnpm db:push --force-reset

# Then seed again
pnpm db:seed:demo
```

---

## 🐛 Troubleshooting

### 1. Database Connection Error

**Error:** `Can't reach database server`

**Fix:**

```bash
# Check PostgreSQL is running
brew services list              # macOS
sudo systemctl status postgresql # Ubuntu

# Start if not running
brew services start postgresql
```

### 2. Prisma Client Error

**Error:** `@prisma/client did not initialize yet`

**Fix:**

```bash
pnpm db:generate
```

### 3. Port 3000 Already in Use

**Fix:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm dev
```

### 4. Seed Script Error

**Error:** `Unique constraint failed on the fields: (email)`

**Fix:**

```bash
# Reset database
pnpm db:push --force-reset
pnpm db:seed:demo
```

### 5. TypeScript Errors

**Fix:**

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm db:generate
```

---

## 📱 Testing on Mobile

### Local Network Access

```bash
# Find your IP address
ifconfig | grep "inet " | grep -v 127.0.0.1  # macOS
ip addr show | grep "inet "                   # Linux

# Start dev server
pnpm dev

# Access from mobile
http://192.168.x.x:3000
```

Update `.env`:

```bash
NEXT_PUBLIC_API_URL="http://192.168.x.x:3000"
```

---

## 🚀 Production Deployment

Lihat dokumentasi lengkap: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

**Quick Deploy ke Vercel:**

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel

# Follow prompts:
# - Connect GitHub
# - Add PostgreSQL database
# - Set environment variables
# - Deploy
```

Database Options:

- **Supabase** - PostgreSQL managed (Free tier)
- **Railway** - Full database hosting (Free $5/month)
- **Neon** - Serverless PostgreSQL (Free tier)

---

## 📚 Documentation

- **[QUICK_START.md](docs/QUICK_START.md)** - Detailed setup guide (500+ lines)
- **[EMAIL_AND_UPLOAD.md](docs/EMAIL_AND_UPLOAD.md)** - Email & file upload features
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[100_PERCENT_COMPLETE.md](docs/100_PERCENT_COMPLETE.md)** - Complete feature checklist

---

## 🤝 Demo Data Overview

Seed script creates:

### Users (3)

- **budi@demo.com** (Admin) - Full access
- **ani@demo.com** (Member) - Limited access
- **rudi@demo.com** (No family) - For invitation testing

### Family (1)

- **Keluarga Budi** - 2 members (Budi & Ani)

### Categories (10)

**Expense:**

- 🍔 Makanan & Minuman
- 🚗 Transport
- 🛒 Belanja
- 💳 Tagihan
- 📚 Pendidikan
- 🏥 Kesehatan
- 🎮 Hiburan

**Income:**

- 💰 Gaji
- 🎁 Bonus
- 📈 Investasi

### Wallets (4)

- 🏦 BCA - Budi (Rp 15.000.000)
- 🏦 Mandiri - Ani (Rp 8.000.000)
- 💵 Dompet Cash (Rp 1.500.000)
- 💳 Dana (Rp 500.000)

### Transactions (150+)

- Income: 3 salary payments (Rp 10.000.000/month)
- Food: 60+ transactions (various amounts)
- Transport: 30+ transactions
- Shopping: 8+ transactions
- Bills: 2 monthly payments (Rp 1.500.000)
- Entertainment: 6+ transactions

**Total Balance:** Rp 25.000.000
**Total Income (3 months):** Rp 30.000.000
**Total Expense:** ~Rp 5.000.000

### Budget (1)

- Month: Current month
- Total: Rp 7.000.000
- Categories:
  - Makanan: Rp 3.000.000
  - Transport: Rp 1.500.000
  - Belanja: Rp 1.000.000
  - Hiburan: Rp 500.000
  - Pendidikan: Rp 1.000.000

### Recurring Transactions (2)

- Monthly salary (Rp 10.000.000) - 1st of month
- Monthly bills (Rp 1.500.000) - 5th of month

### Templates (3)

- Makan Siang (Rp 50.000)
- Isi Bensin (Rp 100.000)
- Belanja Bulanan (Rp 500.000)

---

## 💡 Tips

1. **Use Prisma Studio** untuk explore data dengan GUI
2. **Check logs** di terminal saat development untuk debug
3. **Use demo account** untuk testing features
4. **Backup database** sebelum major changes:
   ```bash
   pg_dump financial_family_tracking > backup.sql
   ```
5. **Monitor performance** dengan React DevTools & Network tab

---

## ❓ Need Help?

- Check **[docs/QUICK_START.md](docs/QUICK_START.md)** untuk detailed guide
- View **[docs/100_PERCENT_COMPLETE.md](docs/100_PERCENT_COMPLETE.md)** untuk feature list
- Read **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** untuk production setup

---

## 🎉 Happy Coding!

Sekarang aplikasi sudah ready dengan 150+ transaksi demo data!

Login → Explore features → Customize untuk kebutuhan Anda 🚀
