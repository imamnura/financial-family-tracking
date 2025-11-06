# 💳 Transaction Management

## Overview

Sistem manajemen transaksi untuk mencatat semua aktivitas keuangan keluarga, termasuk pemasukan, pengeluaran, dan transfer antar wallet.

---

## Features

### ✅ Implemented

- Database schema untuk transactions
- Multiple wallet support
- Category system
- Transaction types (INCOME, EXPENSE, TRANSFER)

### 🚧 In Progress

- Transaction CRUD API
- File upload untuk receipt
- Transaction filtering

### 📋 Planned

- Recurring transactions
- Transaction templates
- Bulk import/export
- Transaction search
- Smart categorization

---

## Transaction Types

### 1. INCOME (Pemasukan)

Transaksi yang menambah saldo wallet.

**Contoh:**

- Gaji bulanan
- Bonus
- Hasil investasi
- Hadiah
- Pendapatan sampingan

### 2. EXPENSE (Pengeluaran)

Transaksi yang mengurangi saldo wallet.

**Contoh:**

- Belanja groceries
- Makan di restoran
- Bensin
- Tagihan listrik
- Biaya pendidikan

### 3. TRANSFER

Transfer dana antar wallet dalam keluarga.

**Contoh:**

- Transfer dari BCA ke GoPay
- Transfer dari rekening ayah ke ibu
- Isi ulang e-wallet

---

## Database Schema

```prisma
enum TransactionType {
  INCOME   // Pemasukan
  EXPENSE  // Pengeluaran
  TRANSFER // Transfer antar wallet
}

model Transaction {
  id          String          @id @default(cuid())
  amount      Float
  type        TransactionType
  description String?
  notes       String?
  date        DateTime        @default(now())

  familyId    String
  family      Family   @relation(fields: [familyId], references: [id])

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])

  fromWalletId String?
  fromWallet   Wallet?  @relation("FromWallet", fields: [fromWalletId], references: [id])

  toWalletId   String?
  toWallet     Wallet?  @relation("ToWallet", fields: [toWalletId], references: [id])

  attachment  String?  // URL to receipt/proof

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## API Endpoints

### GET /api/transactions

Get all transactions with filtering

**Query Parameters:**

```
?page=1
&limit=10
&type=EXPENSE
&categoryId=category-id
&userId=user-id
&walletId=wallet-id
&from=2024-01-01
&to=2024-12-31
&search=keyword
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "transaction-id",
      "amount": 150000,
      "type": "EXPENSE",
      "description": "Belanja groceries",
      "notes": "Belanja bulanan di supermarket",
      "date": "2024-01-15T10:00:00Z",
      "user": {
        "id": "user-id",
        "name": "John Doe"
      },
      "category": {
        "id": "category-id",
        "name": "Makanan & Minuman",
        "icon": "utensils",
        "color": "#EF4444"
      },
      "fromWallet": {
        "id": "wallet-id",
        "name": "BCA - Ayah"
      },
      "attachment": "/uploads/receipt-123.jpg",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### POST /api/transactions

Create new transaction

**Request Body (INCOME/EXPENSE):**

```json
{
  "amount": 150000,
  "type": "EXPENSE",
  "description": "Belanja groceries",
  "notes": "Belanja bulanan di supermarket",
  "date": "2024-01-15T10:00:00Z",
  "categoryId": "category-id",
  "fromWalletId": "wallet-id",
  "attachment": "base64-image-or-file"
}
```

**Request Body (TRANSFER):**

```json
{
  "amount": 500000,
  "type": "TRANSFER",
  "description": "Transfer ke GoPay",
  "fromWalletId": "bca-wallet-id",
  "toWalletId": "gopay-wallet-id",
  "date": "2024-01-15T10:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "transaction-id",
    "amount": 150000,
    "type": "EXPENSE",
    "description": "Belanja groceries",
    "walletBalance": 4850000
  }
}
```

### GET /api/transactions/:id

Get transaction by ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "transaction-id",
    "amount": 150000,
    "type": "EXPENSE",
    "description": "Belanja groceries",
    "notes": "Belanja bulanan",
    "date": "2024-01-15T10:00:00Z",
    "user": { "id": "user-id", "name": "John Doe" },
    "category": { "id": "cat-id", "name": "Makanan" },
    "fromWallet": { "id": "wallet-id", "name": "BCA" },
    "attachment": "/uploads/receipt.jpg"
  }
}
```

### PUT /api/transactions/:id

Update transaction

**Request Body:**

```json
{
  "amount": 200000,
  "description": "Updated description",
  "categoryId": "new-category-id"
}
```

### DELETE /api/transactions/:id

Delete transaction

**Response:**

```json
{
  "success": true,
  "message": "Transaction deleted successfully"
}
```

---

## Business Logic

### 1. Create INCOME Transaction

```typescript
async function createIncome(data: CreateIncomeDTO) {
  // 1. Validate data
  const validated = incomeSchema.parse(data);

  // 2. Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      amount: validated.amount,
      type: "INCOME",
      description: validated.description,
      notes: validated.notes,
      date: validated.date,
      familyId: user.familyId,
      userId: user.id,
      categoryId: validated.categoryId,
      fromWalletId: validated.walletId,
      attachment: validated.attachment,
    },
  });

  // 3. Update wallet balance (+)
  await prisma.wallet.update({
    where: { id: validated.walletId },
    data: {
      balance: { increment: validated.amount },
    },
  });

  // 4. Create audit log
  await createAuditLog({
    action: "CREATE",
    entityType: "Transaction",
    entityId: transaction.id,
    userId: user.id,
    dataAfter: transaction,
  });

  return transaction;
}
```

### 2. Create EXPENSE Transaction

```typescript
async function createExpense(data: CreateExpenseDTO) {
  // 1. Validate data
  const validated = expenseSchema.parse(data);

  // 2. Check wallet balance
  const wallet = await prisma.wallet.findUnique({
    where: { id: validated.walletId },
  });

  if (wallet.balance < validated.amount) {
    throw new Error("Saldo tidak mencukupi");
  }

  // 3. Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      amount: validated.amount,
      type: "EXPENSE",
      description: validated.description,
      notes: validated.notes,
      date: validated.date,
      familyId: user.familyId,
      userId: user.id,
      categoryId: validated.categoryId,
      fromWalletId: validated.walletId,
      attachment: validated.attachment,
    },
  });

  // 4. Update wallet balance (-)
  await prisma.wallet.update({
    where: { id: validated.walletId },
    data: {
      balance: { decrement: validated.amount },
    },
  });

  // 5. Update budget spent (if exists)
  await updateBudgetSpent(validated.categoryId, validated.amount);

  return transaction;
}
```

### 3. Create TRANSFER Transaction

```typescript
async function createTransfer(data: CreateTransferDTO) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate data
    const validated = transferSchema.parse(data);

    // 2. Check source wallet balance
    const fromWallet = await tx.wallet.findUnique({
      where: { id: validated.fromWalletId },
    });

    if (fromWallet.balance < validated.amount) {
      throw new Error("Saldo tidak mencukupi");
    }

    // 3. Create transaction
    const transaction = await tx.transaction.create({
      data: {
        amount: validated.amount,
        type: "TRANSFER",
        description: validated.description,
        date: validated.date,
        familyId: user.familyId,
        userId: user.id,
        fromWalletId: validated.fromWalletId,
        toWalletId: validated.toWalletId,
      },
    });

    // 4. Update source wallet (-)
    await tx.wallet.update({
      where: { id: validated.fromWalletId },
      data: { balance: { decrement: validated.amount } },
    });

    // 5. Update destination wallet (+)
    await tx.wallet.update({
      where: { id: validated.toWalletId },
      data: { balance: { increment: validated.amount } },
    });

    return transaction;
  });
}
```

---

## Validation Schemas

```typescript
import { z } from "zod";

export const createIncomeSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(3, "Description too short"),
  notes: z.string().optional(),
  date: z.date().optional(),
  categoryId: z.string().cuid(),
  walletId: z.string().cuid(),
  attachment: z.string().url().optional(),
});

export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(3, "Description too short"),
  notes: z.string().optional(),
  date: z.date().optional(),
  categoryId: z.string().cuid(),
  walletId: z.string().cuid(),
  attachment: z.string().url().optional(),
});

export const createTransferSchema = z
  .object({
    amount: z.number().positive("Amount must be positive"),
    description: z.string().optional(),
    date: z.date().optional(),
    fromWalletId: z.string().cuid(),
    toWalletId: z.string().cuid(),
  })
  .refine((data) => data.fromWalletId !== data.toWalletId, {
    message: "Cannot transfer to same wallet",
  });
```

---

## Client Components

### Transaction Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function TransactionForm() {
  const form = useForm({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      amount: 0,
      description: "",
      type: "EXPENSE",
    },
  });

  const onSubmit = async (data) => {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      toast.success("Transaction created!");
      form.reset();
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>{/* Form fields */}</form>
  );
}
```

### Transaction List

```typescript
export function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    type: "ALL",
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/transactions?${params}`);
    const data = await response.json();
    setTransactions(data.data);
  };

  return (
    <div>
      <TransactionFilters onChange={setFilters} />
      <TransactionTable data={transactions} />
    </div>
  );
}
```

---

## Best Practices

### ✅ Do's

- ✅ Use database transactions for wallet updates
- ✅ Validate all inputs with Zod
- ✅ Check wallet balance before expense
- ✅ Create audit logs for important changes
- ✅ Update budget spent automatically
- ✅ Handle file uploads securely
- ✅ Add proper error handling

### ❌ Don'ts

- ❌ Update wallet without transaction record
- ❌ Allow negative wallet balance
- ❌ Skip validation
- ❌ Expose sensitive data in API
- ❌ Allow duplicate transactions

---

## Statistics & Reports

### Monthly Summary

```typescript
async function getMonthlyStats(familyId: string, month: Date) {
  const range = getMonthRange(month);

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        familyId,
        type: "INCOME",
        date: { gte: range.from, lte: range.to },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        familyId,
        type: "EXPENSE",
        date: { gte: range.from, lte: range.to },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    income: income._sum.amount || 0,
    expense: expense._sum.amount || 0,
    balance: (income._sum.amount || 0) - (expense._sum.amount || 0),
  };
}
```

### Category Breakdown

```typescript
async function getCategoryBreakdown(familyId: string, month: Date) {
  const range = getMonthRange(month);

  const data = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      familyId,
      type: "EXPENSE",
      date: { gte: range.from, lte: range.to },
    },
    _sum: { amount: true },
  });

  // Join with category data
  const breakdown = await Promise.all(
    data.map(async (item) => {
      const category = await prisma.category.findUnique({
        where: { id: item.categoryId },
      });

      return {
        category: category.name,
        amount: item._sum.amount,
        color: category.color,
      };
    })
  );

  return breakdown;
}
```

---

## Next Steps

1. [ ] Implement transaction CRUD APIs
2. [ ] Create transaction form components
3. [ ] Add file upload for receipts
4. [ ] Build transaction list with filtering
5. [ ] Add transaction statistics
6. [ ] Implement recurring transactions
7. [ ] Add transaction search
8. [ ] Create export to Excel/PDF
9. [ ] Add transaction templates
10. [ ] Implement smart categorization
