# 📐 Architecture & Diagrams

Visual documentation untuk Family Financial Tracker.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Dashboard  │  │ Transactions │  │    Budget    │ │
│  │     Page     │  │     Page     │  │     Page     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │          React Components (Next.js)             │   │
│  │  - Forms, Charts, Tables, Modals, etc.          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                    HTTP/REST API
                          │
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Next.js)                      │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              API Routes (App Router)            │   │
│  │  /api/auth/* | /api/transactions/* | etc.      │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Business Logic Layer                 │   │
│  │  - Validation (Zod)                            │   │
│  │  - Authentication (JWT)                        │   │
│  │  - Authorization (Role-based)                  │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Data Access Layer                  │   │
│  │  - Prisma ORM                                  │   │
│  │  - Database Queries                            │   │
│  │  - Transaction Management                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                    Prisma Client
                          │
┌─────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                  │
│                                                          │
│  ┌──────┐  ┌──────────┐  ┌────────┐  ┌──────────┐    │
│  │ User │  │  Family  │  │ Wallet │  │ Category │    │
│  └──────┘  └──────────┘  └────────┘  └──────────┘    │
│                                                          │
│  ┌────────────┐  ┌────────┐  ┌──────────┐  ┌──────┐  │
│  │Transaction │  │ Budget │  │  Asset   │  │ Goal │  │
│  └────────────┘  └────────┘  └──────────┘  └──────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Transaction Creation Flow

```
User Input (Form)
      │
      ▼
Validation (Zod Schema)
      │
      ▼
API Endpoint (/api/transactions)
      │
      ├─► Check Authentication (JWT)
      │
      ├─► Check Authorization (Role)
      │
      ├─► Validate Business Rules
      │   - Check wallet balance
      │   - Validate category
      │   - Check family membership
      │
      ▼
Database Transaction (Prisma)
      │
      ├─► Create Transaction Record
      │
      ├─► Update Wallet Balance
      │
      ├─► Update Budget (if applicable)
      │
      ├─► Create Audit Log
      │
      ▼
Response to Client
      │
      ├─► Success: Return transaction data
      │
      └─► Error: Return error message
```

---

## 🗄️ Database Relationships

```
                    ┌─────────────┐
                    │   Family    │
                    │  (1 family) │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   User   │    │  Wallet  │    │ Category │
    │ (many)   │    │ (many)   │    │ (many)   │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                  ┌─────────────┐
                  │ Transaction │
                  │   (many)    │
                  └─────────────┘

User also creates:
├─► Assets (1-to-many)
├─► Liabilities (1-to-many)
├─► Budgets (1-to-many)
└─► Goal Contributions (1-to-many)

Family also has:
├─► Goals (1-to-many)
├─► Family Invites (1-to-many)
└─► Audit Logs (1-to-many)
```

---

## 🔐 Authentication Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ POST /api/auth/login
     │ { email, password }
     │
     ▼
┌─────────────────────┐
│  Login API Route    │
│                     │
│ 1. Validate input   │
│ 2. Find user by     │
│    email            │
│ 3. Compare password │
│    (bcrypt)         │
│ 4. Generate JWT     │
│    token            │
└────┬────────────────┘
     │
     │ Return JWT token
     │
     ▼
┌──────────┐
│  Client  │
│          │
│ Store    │
│ token in │
│ cookie/  │
│ storage  │
└────┬─────┘
     │
     │ Subsequent requests
     │ Header: Authorization: Bearer <token>
     │
     ▼
┌─────────────────────┐
│  Protected Route    │
│                     │
│ 1. Extract token    │
│ 2. Verify token     │
│    (JWT)            │
│ 3. Check role       │
│ 4. Process request  │
└─────────────────────┘
```

---

## 💳 Transaction Types Flow

### Income Transaction

```
User submits income
      │
      ▼
Validate amount > 0
      │
      ▼
Create transaction record
(type: INCOME)
      │
      ▼
Update wallet balance
(balance += amount)
      │
      ▼
Success!
```

### Expense Transaction

```
User submits expense
      │
      ▼
Validate amount > 0
      │
      ▼
Check wallet balance
(balance >= amount?)
      │
      ├─► No: Return error
      │
      └─► Yes: Continue
            │
            ▼
      Create transaction
      (type: EXPENSE)
            │
            ▼
      Update wallet balance
      (balance -= amount)
            │
            ▼
      Update budget spent
      (spent += amount)
            │
            ▼
      Check budget alert
      (spent/amount > threshold?)
            │
            └─► Send notification
```

### Transfer Transaction

```
User submits transfer
      │
      ▼
Validate wallets different
      │
      ▼
Check source wallet balance
(balance >= amount?)
      │
      ├─► No: Return error
      │
      └─► Yes: Start DB transaction
            │
            ▼
      Create transfer record
      (type: TRANSFER)
            │
            ▼
      Update source wallet
      (balance -= amount)
            │
            ▼
      Update destination wallet
      (balance += amount)
            │
            ▼
      Commit DB transaction
            │
            ▼
      Success!
```

---

## 📊 Budget Monitoring Flow

```
┌───────────────────┐
│  New Expense      │
│  Created          │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Find Active      │
│  Budget for       │
│  Category         │
└────────┬──────────┘
         │
         ├─► No budget found → Skip
         │
         └─► Budget found
                  │
                  ▼
         ┌───────────────────┐
         │  Update Budget    │
         │  Spent Amount     │
         │  spent += amount  │
         └────────┬──────────┘
                  │
                  ▼
         ┌───────────────────┐
         │  Calculate %      │
         │  spent/total      │
         └────────┬──────────┘
                  │
                  ▼
         ┌───────────────────┐
         │  Check Threshold  │
         │  % >= alert?      │
         └────────┬──────────┘
                  │
                  ├─► No → Continue
                  │
                  └─► Yes
                       │
                       ▼
              ┌──────────────────┐
              │  Send Alert      │
              │  - Email         │
              │  - Notification  │
              └──────────────────┘
```

---

## 🎯 Goal Tracking Flow

```
Family creates goal
      │
      ▼
Set target amount & deadline
      │
      ▼
Members contribute
      │
      ├─► Create contribution record
      │
      └─► Update goal current amount
            (currentAmount += contribution)
            │
            ▼
      Check if goal reached
      (currentAmount >= targetAmount?)
            │
            ├─► No: Keep tracking
            │
            └─► Yes
                  │
                  ▼
            Update status to COMPLETED
                  │
                  ▼
            Send achievement notification
                  │
                  ▼
            Optionally distribute funds
            (create distribution records)
```

---

## 🔍 Audit Log Process

```
Important action occurs:
- Create transaction
- Update user
- Delete asset
etc.

      │
      ▼
Capture data before change
(serialize to JSON)
      │
      ▼
Perform the change
      │
      ▼
Capture data after change
(serialize to JSON)
      │
      ▼
Create audit log record:
- action: CREATE/UPDATE/DELETE
- entityType: "Transaction"
- entityId: "transaction-id"
- dataBefore: "{...}"
- dataAfter: "{...}"
- userId: current user
- timestamp: now
      │
      ▼
Log saved for future review
```

---

## 📱 Component Hierarchy (Future)

```
App
│
├─► Layout
│   ├─► Header
│   │   ├─► Logo
│   │   ├─► Navigation
│   │   └─► UserMenu
│   │
│   ├─► Sidebar
│   │   ├─► MainNav
│   │   ├─► FamilySelector
│   │   └─► QuickActions
│   │
│   └─► Footer
│
├─► Dashboard
│   ├─► StatsCards
│   │   ├─► IncomeCard
│   │   ├─► ExpenseCard
│   │   └─► BalanceCard
│   │
│   ├─► Charts
│   │   ├─► CategoryPieChart
│   │   ├─► TrendLineChart
│   │   └─► BudgetBarChart
│   │
│   └─► RecentActivity
│       └─► TransactionList
│
├─► Transactions
│   ├─► TransactionFilters
│   ├─► TransactionTable
│   └─► TransactionForm
│       ├─► AmountInput
│       ├─► CategorySelect
│       ├─► WalletSelect
│       └─► DatePicker
│
└─► Settings
    ├─► ProfileSettings
    ├─► FamilySettings
    └─► PreferencesSettings
```

---

## 🔄 State Management (Future)

```
Context Providers:
│
├─► AuthContext
│   - Current user
│   - Login/logout functions
│   - Authentication state
│
├─► FamilyContext
│   - Current family
│   - Family members
│   - Switch family
│
├─► TransactionContext
│   - Transactions list
│   - Filters
│   - CRUD operations
│
└─► ThemeContext
    - Dark/light mode
    - Color preferences
```

---

## 📦 Deployment Architecture (Future)

```
┌─────────────────┐
│   GitHub Repo   │
└────────┬────────┘
         │
         │ Push to main
         │
         ▼
┌─────────────────┐
│  Vercel Build   │
│  - Next.js      │
│  - TypeScript   │
│  - TailwindCSS  │
└────────┬────────┘
         │
         │ Deploy
         │
         ▼
┌─────────────────┐       ┌──────────────┐
│  Vercel Edge    │       │  Railway     │
│  Network        │◄──────┤  PostgreSQL  │
│  - Frontend     │       │  Database    │
│  - API Routes   │       └──────────────┘
└────────┬────────┘
         │
         │ CDN
         │
         ▼
┌─────────────────┐
│   End Users     │
└─────────────────┘
```

---

## 📊 Data Flow Summary

1. **User Authentication:** JWT-based, stored in cookies
2. **Data Fetching:** Server Components (SSR) + Client Components (CSR)
3. **API Calls:** Next.js API Routes with Prisma
4. **Database:** PostgreSQL with Prisma ORM
5. **Real-time:** Polling or WebSocket (future)
6. **Caching:** Next.js cache + React Query (future)

---

**Note:** Diagrams dibuat dengan ASCII art untuk compatibility.
Dapat di-render dengan tools seperti Mermaid untuk visual yang lebih baik.

---

[Back to Documentation](./README.md) | [Database Schema](./DATABASE.md) | [Development Guide](./DEVELOPMENT.md)
