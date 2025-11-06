# 🚀 Quick Start Guide

Panduan cepat untuk memulai development Family Financial Tracker.

---

## ⚡ TL;DR

```bash
# Clone & install
git clone <repo-url>
cd family-tracking-realtime
pnpm install

# Setup environment
cp .env.example .env
# Edit .env dengan PostgreSQL URL

# Setup database
pnpm db:generate
pnpm db:push
pnpm db:seed

# Run dev server
pnpm dev
# Open http://localhost:3000
```

---

## 📋 Prerequisites

Pastikan sudah terinstall:

- ✅ **Node.js** 18.x atau lebih baru
- ✅ **pnpm** 8.x atau lebih baru
- ✅ **PostgreSQL** 14.x atau lebih baru
- ✅ **Git**

### Install Prerequisites

#### macOS (menggunakan Homebrew)

```bash
# Node.js
brew install node

# pnpm
npm install -g pnpm

# PostgreSQL
brew install postgresql@14
brew services start postgresql@14
```

#### Windows (menggunakan Chocolatey)

```bash
# Node.js
choco install nodejs

# pnpm
npm install -g pnpm

# PostgreSQL
choco install postgresql14
```

#### Linux (Ubuntu/Debian)

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PostgreSQL
sudo apt-get install postgresql-14
```

---

## 🏗️ Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/family-tracking-realtime.git
cd family-tracking-realtime
```

### 2. Install Dependencies

```bash
pnpm install
```

Ini akan install semua dependencies:

- Next.js, React, TypeScript
- Prisma, PostgreSQL
- TailwindCSS, Lucide Icons
- Dan lainnya...

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` dan update konfigurasi:

```env
# Database - WAJIB DIUBAH
DATABASE_URL="postgresql://user:password@localhost:5432/family_tracker"

# JWT Secret - WAJIB DIUBAH di production
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Email (opsional untuk development)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
```

**Tips:** Untuk PostgreSQL lokal:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/family_tracker"
```

---

## 🗄️ Database Setup

### 1. Create Database

```bash
# Login ke PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE family_tracker;

# Exit
\q
```

### 2. Generate Prisma Client

```bash
pnpm db:generate
```

Output:

```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### 3. Push Schema ke Database

```bash
pnpm db:push
```

Ini akan create semua tables di database.

### 4. Seed Demo Data (Opsional)

```bash
pnpm db:seed
```

Akan create:

- 1 Family: "Keluarga Demo"
- 2 Users: admin@demo.com, member@demo.com (password: admin123)
- 3 Wallets: BCA, GoPay, Cash
- 12 Categories
- Sample transactions, assets, goals, budgets

---

## 🚀 Run Development Server

```bash
pnpm dev
```

Server akan berjalan di:

```
http://localhost:3000
```

Output:

```
  ▲ Next.js 16.0.1
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.100:3000

 ✓ Ready in 2.5s
```

---

## 🎮 Development Tools

### Prisma Studio (Database GUI)

```bash
pnpm db:studio
```

Akan membuka Prisma Studio di browser:

```
http://localhost:5555
```

Gunakan untuk:

- View database tables
- Edit data manually
- Debug database issues

### ESLint (Code Linting)

```bash
pnpm lint
```

### Type Checking

```bash
# Manual type check
npx tsc --noEmit
```

---

## 📚 Project Structure Tour

```
family-tracking-realtime/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Seed data
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components (future)
│   ├── lib/              # Utilities
│   │   ├── prisma.ts    # Prisma client
│   │   ├── env.ts       # Environment config
│   │   └── utils.ts     # Helper functions
│   └── middleware.ts     # Next.js middleware (future)
├── docs/                 # Documentation
├── .env                  # Environment variables
└── package.json         # Dependencies & scripts
```

---

## 🧪 Verify Setup

### 1. Check Database Connection

```bash
# Test dengan Prisma
pnpm prisma db execute --stdin <<< "SELECT 1;"
```

### 2. Check if Demo Data Exists

Login ke Prisma Studio:

```bash
pnpm db:studio
```

Verify:

- ✅ User table ada 2 records
- ✅ Family table ada 1 record
- ✅ Wallet table ada 3 records

### 3. Test Login (after auth is implemented)

```
Email: admin@demo.com
Password: admin123
```

---

## 🎯 Next Steps

### For Beginners

1. ✅ Explore Prisma Studio - lihat struktur database
2. ✅ Baca dokumentasi di `/docs`
3. ✅ Lihat file `src/lib/utils.ts` - helper functions
4. ✅ Check `prisma/schema.prisma` - database models

### For Developers

1. 🔨 Implement authentication API
2. 🔨 Create transaction CRUD endpoints
3. 🔨 Build dashboard UI
4. 🔨 Add budget management

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) untuk contribution guidelines.

---

## 🆘 Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm dev
```

### Database Connection Error

```bash
# Check PostgreSQL running
pg_isready

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

### Prisma Client Not Found

```bash
# Regenerate
pnpm db:generate
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

---

## 📖 Documentation

- [README.md](./README.md) - Project overview
- [PRISMA_SETUP.md](./PRISMA_SETUP.md) - Database setup
- [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) - Auth guide
- [docs/TRANSACTIONS.md](./docs/TRANSACTIONS.md) - Transaction guide
- [docs/DATABASE.md](./docs/DATABASE.md) - Database schema
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Dev guide

---

## 🎓 Learning Resources

### Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn](https://nextjs.org/learn)

### Prisma

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Examples](https://github.com/prisma/prisma-examples)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs)

### TailwindCSS

- [TailwindCSS Documentation](https://tailwindcss.com/docs)

---

## ❓ Need Help?

1. Check [Documentation](./docs/)
2. Search [Issues](https://github.com/OWNER/REPO/issues)
3. Create new issue
4. Ask in discussions

---

## ✅ Checklist

Setup completed when you can:

- [ ] Run `pnpm dev` successfully
- [ ] Access http://localhost:3000
- [ ] Open Prisma Studio with `pnpm db:studio`
- [ ] See demo data in database
- [ ] Run `pnpm lint` without errors
- [ ] Database has all tables from schema

---

Happy coding! 🚀

Need help? Create an issue or check the docs.
