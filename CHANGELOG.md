# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Authentication system (JWT)
- Transaction CRUD APIs
- Dashboard with statistics
- Budget management
- Asset & liability tracking
- Financial goals
- Email notifications
- Export to PDF/Excel

---

## [0.1.0] - 2025-10-31

### Added - Initial Setup

#### Project Foundation

- ✅ Next.js 16 with TypeScript 5
- ✅ TailwindCSS 4 with custom theme configuration
- ✅ Prisma 6 ORM with PostgreSQL
- ✅ Project structure and folder organization
- ✅ Environment configuration (.env setup)

#### Dependencies

- ✅ Core: React 19, Next.js 16, TypeScript 5
- ✅ Database: Prisma, PostgreSQL
- ✅ UI: TailwindCSS, Lucide Icons
- ✅ Forms: React Hook Form, Zod validation
- ✅ Charts: Recharts
- ✅ Auth: jsonwebtoken, bcryptjs
- ✅ Email: Nodemailer
- ✅ Utils: date-fns, axios, clsx, nanoid
- ✅ Export: xlsx, jspdf, jspdf-autotable

#### Database Schema

Complete database schema with 15 models:

- ✅ User (with role ADMIN/MEMBER)
- ✅ Family (multi-user support)
- ✅ Wallet (multiple wallets per family)
- ✅ Category (custom categories per family)
- ✅ Transaction (income/expense/transfer)
- ✅ Asset (property, vehicle, investment)
- ✅ Liability (mortgage, loan, credit card)
- ✅ LiabilityPayment (payment tracking)
- ✅ FamilyInvite (invite system)
- ✅ Goal (financial goals)
- ✅ GoalContribution (member contributions)
- ✅ GoalDistribution (goal fund distribution)
- ✅ Budget (monthly/yearly budgets)
- ✅ AuditLog (change tracking)

#### Utilities & Helpers

- ✅ `lib/prisma.ts` - Prisma Client singleton pattern
- ✅ `lib/prisma-helpers.ts` - Database utilities
  - PrismaErrorHandler for user-friendly errors
  - Pagination helpers
  - Date range filters
  - Safe user select (exclude password)
- ✅ `lib/env.ts` - Type-safe environment variables
- ✅ `lib/utils.ts` - General utilities
  - Currency formatting (IDR)
  - Date formatting (Indonesian locale)
  - Relative time
  - Class name merging (cn)

#### Styling

- ✅ Custom Tailwind configuration
  - Extended color palette (primary, secondary, success, warning, danger)
  - Financial-specific colors (income, expense)
  - Dark mode support
  - Custom animations
  - Border radius variables
- ✅ Global CSS with utility classes
  - Button styles (primary, secondary, danger, success)
  - Input/form styles
  - Badge components
  - Table styles
  - Custom scrollbar
  - Toast notifications

#### Database Seeding

- ✅ Seed script with demo data
  - Demo family: "Keluarga Demo"
  - 2 users (admin@demo.com, member@demo.com)
  - 3 wallets (BCA, GoPay, Cash)
  - 12 categories (4 income, 8 expense)
  - Sample transactions
  - Sample asset (rumah)
  - Sample liability (KPR)
  - Sample goal (liburan)
  - Sample budget

#### Documentation

- ✅ README.md - Comprehensive project overview
- ✅ PRISMA_SETUP.md - Database setup guide
- ✅ docs/AUTHENTICATION.md - Auth system documentation
- ✅ docs/TRANSACTIONS.md - Transaction management guide
- ✅ docs/DATABASE.md - Database schema documentation
- ✅ docs/DEVELOPMENT.md - Developer guide
- ✅ CHANGELOG.md - Project changelog

#### Configuration Files

- ✅ package.json with all dependencies and scripts
- ✅ tsconfig.json for TypeScript
- ✅ tailwind.config.ts for styling
- ✅ eslint.config.mjs for code linting
- ✅ .env.example for environment template
- ✅ .gitignore for version control

#### Scripts

Database scripts:

```bash
db:generate  # Generate Prisma Client
db:push      # Push schema to database
db:migrate   # Run migrations
db:studio    # Open Prisma Studio
db:seed      # Seed demo data
```

Development scripts:

```bash
dev          # Run development server
build        # Build for production
start        # Start production server
lint         # Run ESLint
```

### Project Statistics

- **Total Files Created:** 20+
- **Total Lines of Code:** 3000+
- **Database Models:** 15
- **Database Enums:** 7
- **Documentation Pages:** 6
- **Dependencies:** 25+
- **Dev Dependencies:** 10+

---

## Migration Guide

### From scratch to v0.1.0

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Setup environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup database:**

   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```

---

## Contributors

- Initial setup and foundation - Your Name

---

## Notes

This is the initial release focusing on project foundation and infrastructure.
No user-facing features are implemented yet, but the complete architecture is ready for development.

### Next Phase (v0.2.0) - Planned

- [ ] Authentication system
- [ ] Transaction management APIs
- [ ] Basic UI components
- [ ] Dashboard page

---

[Unreleased]: https://github.com/yourusername/family-tracking-realtime/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/family-tracking-realtime/releases/tag/v0.1.0
