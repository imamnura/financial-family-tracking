# Transaction Management - Fitur Lanjutan

Dokumentasi untuk fitur-fitur manajemen transaksi lanjutan: Recurring Transactions, Transaction Templates, dan Wallet Transfers.

## 1. Recurring Transactions (Transaksi Berulang)

### Overview

Transaksi berulang memungkinkan pengguna membuat transaksi otomatis yang dieksekusi secara periodik (harian, mingguan, bulanan, atau tahunan).

### Database Schema

```prisma
enum RecurringFrequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

enum RecurringStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

model RecurringTransaction {
  id            String              @id @default(uuid())
  name          String
  type          TransactionType
  amount        Float
  description   String?
  notes         String?
  frequency     RecurringFrequency
  startDate     DateTime
  endDate       DateTime?
  nextDate      DateTime?
  lastRunDate   DateTime?
  status        RecurringStatus     @default(ACTIVE)
  dayOfMonth    Int?                // For MONTHLY: 1-31
  dayOfWeek     Int?                // For WEEKLY: 0-6 (0 = Sunday)

  familyId      String
  family        Family              @relation(fields: [familyId], references: [id], onDelete: Cascade)

  createdById   String
  createdBy     User                @relation(fields: [createdById], references: [id])

  categoryId    String?
  category      Category?           @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  fromWalletId  String?
  fromWallet    Wallet?             @relation("RecurringFrom", fields: [fromWalletId], references: [id])

  toWalletId    String?
  toWallet      Wallet?             @relation("RecurringTo", fields: [toWalletId], references: [id])

  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
}
```

### API Endpoints

#### 1. List Recurring Transactions

```http
GET /api/recurring-transactions?type=EXPENSE&status=ACTIVE
```

**Query Parameters:**

- `type`: Filter by transaction type (INCOME/EXPENSE)
- `status`: Filter by status (ACTIVE/PAUSED/COMPLETED/CANCELLED)

**Response:**

```json
{
  "recurrings": [
    {
      "id": "uuid",
      "name": "Monthly Salary",
      "type": "INCOME",
      "amount": 10000000,
      "frequency": "MONTHLY",
      "nextDate": "2024-02-01T00:00:00Z",
      "status": "ACTIVE",
      "category": {...},
      "toWallet": {...}
    }
  ]
}
```

#### 2. Create Recurring Transaction

```http
POST /api/recurring-transactions
Content-Type: application/json

{
  "name": "Rent Payment",
  "type": "EXPENSE",
  "amount": 5000000,
  "description": "Monthly apartment rent",
  "frequency": "MONTHLY",
  "startDate": "2024-01-01T00:00:00Z",
  "dayOfMonth": 1,
  "categoryId": "uuid",
  "fromWalletId": "uuid"
}
```

#### 3. Get Single Recurring Transaction

```http
GET /api/recurring-transactions/{id}
```

#### 4. Update Recurring Transaction

```http
PUT /api/recurring-transactions/{id}
Content-Type: application/json

{
  "status": "PAUSED",
  "amount": 5500000
}
```

#### 5. Delete Recurring Transaction

```http
DELETE /api/recurring-transactions/{id}
```

#### 6. Execute Recurring Transaction Manually

```http
POST /api/recurring-transactions/{id}/execute
```

Creates a transaction immediately and updates nextDate.

### Automatic Execution (Cron Job)

#### Endpoint for Background Service

```http
POST /api/cron/execute-recurring
Authorization: Bearer {CRON_SECRET}
```

**Setup Cron Job (Vercel):**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/execute-recurring",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Environment Variable:**

```env
CRON_SECRET=your-secret-key-here
```

**Alternative: GitHub Actions**

Create `.github/workflows/cron-recurring.yml`:

```yaml
name: Execute Recurring Transactions
on:
  schedule:
    - cron: "0 0 * * *" # Daily at midnight UTC
  workflow_dispatch:

jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - name: Execute recurring transactions
        run: |
          curl -X POST https://your-app.vercel.app/api/cron/execute-recurring \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### UI Components

**File:** `src/components/recurring/RecurringList.tsx`

Features:

- List all recurring transactions
- Filter by type and status
- Pause/Resume recurring
- Execute manually
- Edit and delete

**Usage:**

```tsx
import RecurringList from "@/components/recurring/RecurringList";

export default function RecurringPage() {
  return <RecurringList />;
}
```

---

## 2. Transaction Templates

### Overview

Templates memungkinkan pengguna menyimpan transaksi yang sering dilakukan dan menggunakannya dengan cepat.

### Database Schema

```prisma
model TransactionTemplate {
  id            String              @id @default(uuid())
  name          String
  type          TransactionType
  amount        Float?              // Optional: can be set when using
  description   String?
  notes         String?
  usageCount    Int                 @default(0)
  lastUsedAt    DateTime?

  familyId      String
  family        Family              @relation(fields: [familyId], references: [id], onDelete: Cascade)

  createdById   String
  createdBy     User                @relation(fields: [createdById], references: [id])

  categoryId    String?
  category      Category?           @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  fromWalletId  String?
  fromWallet    Wallet?             @relation("TemplateFrom", fields: [fromWalletId], references: [id])

  toWalletId    String?
  toWallet      Wallet?             @relation("TemplateTo", fields: [toWalletId], references: [id])

  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
}
```

### API Endpoints

#### 1. List Templates

```http
GET /api/templates?type=EXPENSE
```

**Response:**

```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Grocery Shopping",
      "type": "EXPENSE",
      "amount": 500000,
      "usageCount": 24,
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "category": {...},
      "fromWallet": {...}
    }
  ]
}
```

#### 2. Create Template

```http
POST /api/templates
Content-Type: application/json

{
  "name": "Gas Station",
  "type": "EXPENSE",
  "amount": 200000,
  "categoryId": "uuid",
  "fromWalletId": "uuid"
}
```

#### 3. Get Single Template

```http
GET /api/templates/{id}
```

#### 4. Update Template

```http
PUT /api/templates/{id}
Content-Type: application/json

{
  "amount": 250000
}
```

#### 5. Delete Template

```http
DELETE /api/templates/{id}
```

#### 6. Use Template (Create Transaction)

```http
POST /api/templates/{id}/use
Content-Type: application/json

{
  "amount": 180000,
  "date": "2024-01-20T00:00:00Z",
  "notes": "Special discount today"
}
```

**Response:**

```json
{
  "transaction": {...},
  "template": {
    "id": "uuid",
    "usageCount": 25,
    "lastUsedAt": "2024-01-20T00:00:00Z"
  }
}
```

### UI Components

**File:** `src/components/templates/TemplateList.tsx`

Features:

- Grid display of templates
- Quick use with modal
- Edit and delete templates
- Shows usage statistics
- Filter by type

**Usage:**

```tsx
import TemplateList from "@/components/templates/TemplateList";

export default function TemplatesPage() {
  return <TemplateList />;
}
```

---

## 3. Wallet Transfers

### Overview

Transfer saldo antar wallet/rekening dalam keluarga.

**Note:** Fitur ini sudah ada dan fully functional.

### API Endpoint

```http
POST /api/wallets/transfer
Content-Type: application/json

{
  "fromWalletId": "uuid",
  "toWalletId": "uuid",
  "amount": 1000000,
  "description": "Transfer for savings"
}
```

**Features:**

- Atomic transaction (both wallets updated simultaneously)
- Creates two transactions (expense from source, income to destination)
- Auto-creates "Transfer" category if doesn't exist
- Full audit logging

### UI Component

**File:** `src/components/TransferModal.tsx`

Already integrated in the application.

---

## Features Comparison

| Feature         | Recurring            | Templates           | Transfers |
| --------------- | -------------------- | ------------------- | --------- |
| Auto-execute    | ✅ Yes               | ❌ No               | ❌ No     |
| Schedule        | ✅ Yes               | ❌ No               | ❌ No     |
| Quick entry     | ❌ No                | ✅ Yes              | ✅ Yes    |
| Usage tracking  | ✅ Yes (lastRunDate) | ✅ Yes (usageCount) | ❌ No     |
| Between wallets | ❌ No                | ❌ No               | ✅ Yes    |

---

## Usage Examples

### Example 1: Monthly Salary (Recurring)

```json
{
  "name": "Monthly Salary",
  "type": "INCOME",
  "amount": 15000000,
  "frequency": "MONTHLY",
  "startDate": "2024-01-01",
  "dayOfMonth": 25,
  "toWalletId": "bank-account-id"
}
```

### Example 2: Coffee Shop (Template)

```json
{
  "name": "Starbucks",
  "type": "EXPENSE",
  "amount": 45000,
  "categoryId": "food-beverage-id",
  "fromWalletId": "wallet-id"
}
```

Then use with override:

```json
{
  "amount": 52000,
  "notes": "Added pastry today"
}
```

### Example 3: Savings Transfer

```json
{
  "fromWalletId": "checking-account",
  "toWalletId": "savings-account",
  "amount": 2000000,
  "description": "Monthly savings transfer"
}
```

---

## Database Migration

After adding the new models, run:

```bash
npx prisma migrate dev --name add_recurring_and_templates
npx prisma generate
```

---

## Security Considerations

1. **Family Isolation**: All queries filter by `familyId` from session
2. **Authorization**: getCurrentSession() validates user access
3. **Cron Secret**: Protect background job with secret token
4. **Validation**: Zod schemas validate all inputs
5. **Atomic Operations**: Use Prisma transactions for consistency

---

## Future Enhancements

1. **Recurring Transactions:**

   - Email/push notifications before execution
   - Smart scheduling (skip weekends/holidays)
   - Bulk pause/resume
   - Execution history view

2. **Templates:**

   - Template categories/groups
   - Share templates with family
   - Import/export templates
   - Suggested templates based on history

3. **Transfers:**
   - Scheduled transfers
   - Recurring transfers
   - Transfer limits/approvals
   - Transfer categories

---

## Troubleshooting

### Recurring not executing?

1. Check cron job is running
2. Verify CRON_SECRET environment variable
3. Check `nextDate` is in the past
4. Verify `status` is ACTIVE
5. Check logs at `/api/cron/execute-recurring` (GET)

### Template not working?

1. Verify wallet exists and belongs to family
2. Check category is not deleted
3. Ensure amount is provided (template or override)

### Transfer failed?

1. Check source wallet has sufficient balance
2. Verify both wallets belong to same family
3. Check for database transaction errors in logs

---

## API Testing

Use the following cURL commands to test:

```bash
# Create recurring
curl -X POST http://localhost:3000/api/recurring-transactions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Recurring",
    "type": "EXPENSE",
    "amount": 100000,
    "frequency": "MONTHLY",
    "startDate": "2024-01-01T00:00:00Z"
  }'

# Create template
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "type": "EXPENSE",
    "amount": 50000
  }'

# Use template
curl -X POST http://localhost:3000/api/templates/{id}/use \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 60000
  }'

# Execute cron
curl -X POST http://localhost:3000/api/cron/execute-recurring \
  -H "Authorization: Bearer your-secret"
```

---

## Summary

✅ **Completed Features:**

- Recurring Transactions (CRUD + Auto-execution)
- Transaction Templates (CRUD + Quick Use)
- Wallet Transfers (Already existed)
- Cron job for automatic execution
- Full UI components
- Comprehensive API documentation

📝 **Next Steps:**

1. Run database migration
2. Set up cron job (Vercel or GitHub Actions)
3. Configure CRON_SECRET environment variable
4. Test all features in development
5. Deploy to production
