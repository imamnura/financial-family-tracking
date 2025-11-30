# 👥 Family Management Features Documentation

## 📋 Overview

Fitur manajemen keluarga yang memungkinkan admin untuk mengatur preferensi keluarga dan melihat riwayat aktivitas.

---

## 1️⃣ Family Settings & Preferences

### API Endpoints

#### GET `/api/family/settings`

Mendapatkan pengaturan keluarga saat ini.

**Response:**

```json
{
  "family": {
    "id": "clxxx",
    "name": "Keluarga Budi",
    "description": "Keluarga harmonis",
    "currency": "IDR",
    "timezone": "Asia/Jakarta",
    "language": "id",
    "dateFormat": "DD/MM/YYYY",
    "budgetAlerts": true,
    "goalReminders": true,
    "weeklyReport": false,
    "monthlyReport": true,
    "emailNotif": true,
    "defaultBudgetAlert": 80,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "members": 4,
      "wallets": 3,
      "categories": 12,
      "transactions": 150,
      "budgets": 8,
      "goals": 3
    }
  }
}
```

#### PUT `/api/family/settings`

Update pengaturan keluarga (Admin only).

**Request Body:**

```json
{
  "name": "Keluarga Sejahtera",
  "description": "Keluarga yang bahagia",
  "currency": "IDR",
  "timezone": "Asia/Jakarta",
  "language": "id",
  "dateFormat": "DD/MM/YYYY",
  "budgetAlerts": true,
  "goalReminders": true,
  "weeklyReport": false,
  "monthlyReport": true,
  "emailNotif": true,
  "defaultBudgetAlert": 80
}
```

**Response:**

```json
{
  "family": {
    "id": "clxxx",
    "name": "Keluarga Sejahtera"
    // ... updated fields
  }
}
```

### Settings Fields

| Field                | Type           | Description                 | Default          |
| -------------------- | -------------- | --------------------------- | ---------------- |
| `name`               | `string`       | Nama keluarga               | Required         |
| `description`        | `string?`      | Deskripsi keluarga          | `null`           |
| `currency`           | `string`       | Mata uang (ISO 4217)        | `"IDR"`          |
| `timezone`           | `string`       | Zona waktu                  | `"Asia/Jakarta"` |
| `language`           | `"id" \| "en"` | Bahasa                      | `"id"`           |
| `dateFormat`         | `string`       | Format tanggal              | `"DD/MM/YYYY"`   |
| `budgetAlerts`       | `boolean`      | Alert budget threshold      | `true`           |
| `goalReminders`      | `boolean`      | Reminder goal deadlines     | `true`           |
| `weeklyReport`       | `boolean`      | Laporan mingguan            | `false`          |
| `monthlyReport`      | `boolean`      | Laporan bulanan             | `true`           |
| `emailNotif`         | `boolean`      | Email notifications         | `true`           |
| `defaultBudgetAlert` | `number?`      | Default alert threshold (%) | `80`             |

### UI Components

**Location:** `/family/settings`

#### Features:

- ✅ Informasi umum (nama, deskripsi)
- ✅ Pengaturan regional (mata uang, zona waktu, bahasa, format tanggal)
- ✅ Notifikasi & peringatan (budget, goal, laporan)
- ✅ Budget alert threshold slider
- ✅ Family statistics display
- ✅ Admin-only access
- ✅ Auto-save with success message
- ✅ Form validation
- ✅ Reset functionality

---

## 2️⃣ Activity Timeline

### API Endpoints

#### GET `/api/family/activity`

Mendapatkan riwayat aktivitas keluarga dari audit logs.

**Query Parameters:**

- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `action`: string (filter by action type)
- `entityType`: string (filter by entity type)
- `userId`: string (filter by user)
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**

```json
{
  "activities": [
    {
      "id": "clxxx",
      "action": "CREATE_TRANSACTION",
      "entityType": "Transaction",
      "entityId": "clyyy",
      "dataBefore": null,
      "dataAfter": {...},
      "details": {...},
      "changes": {
        "amount": {
          "old": null,
          "new": 50000
        }
      },
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": "clzzz",
        "name": "Budi Santoso",
        "email": "budi@example.com",
        "avatar": null
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### Activity Types

| Action                   | Label              | Icon | Color  |
| ------------------------ | ------------------ | ---- | ------ |
| `CREATE_TRANSACTION`     | Transaksi Dibuat   | 💰   | green  |
| `UPDATE_TRANSACTION`     | Transaksi Diubah   | ✏️   | blue   |
| `DELETE_TRANSACTION`     | Transaksi Dihapus  | 🗑️   | red    |
| `CREATE_BUDGET`          | Budget Dibuat      | 📊   | purple |
| `UPDATE_BUDGET`          | Budget Diubah      | 📈   | blue   |
| `DELETE_BUDGET`          | Budget Dihapus     | 📉   | red    |
| `CREATE_GOAL`            | Target Dibuat      | 🎯   | green  |
| `UPDATE_GOAL`            | Target Diubah      | 🔄   | blue   |
| `DELETE_GOAL`            | Target Dihapus     | ❌   | red    |
| `GOAL_CONTRIBUTION`      | Kontribusi Target  | ➕   | green  |
| `CREATE_ASSET`           | Aset Ditambahkan   | 🏠   | green  |
| `UPDATE_ASSET`           | Aset Diubah        | 🔧   | blue   |
| `DELETE_ASSET`           | Aset Dihapus       | 🔻   | red    |
| `CREATE_LIABILITY`       | Hutang Ditambahkan | 💳   | orange |
| `UPDATE_LIABILITY`       | Hutang Diubah      | 💱   | blue   |
| `DELETE_LIABILITY`       | Hutang Dihapus     | ✅   | green  |
| `WALLET_TRANSFER`        | Transfer Dompet    | 💸   | blue   |
| `UPDATE_FAMILY_SETTINGS` | Pengaturan Diubah  | ⚙️   | gray   |
| `MEMBER_INVITED`         | Anggota Diundang   | 📧   | blue   |
| `MEMBER_JOINED`          | Anggota Bergabung  | 👥   | green  |

### UI Components

**Location:** `/family/settings` (Activity Timeline tab)

#### Features:

- ✅ Timeline display with icons and colors
- ✅ Filter by action type
- ✅ Filter by entity type
- ✅ Pagination (20 items per page)
- ✅ Relative time display ("2 jam lalu")
- ✅ Changes diff display (old → new)
- ✅ User attribution
- ✅ Empty state
- ✅ Loading state
- ✅ Reset filters

---

## 🎨 UI Screenshots

### Family Settings Page

```
┌─────────────────────────────────────────────────┐
│ ⚙️ Pengaturan Keluarga                          │
│ Kelola preferensi dan lihat riwayat aktivitas   │
├─────────────────────────────────────────────────┤
│ ⚙️ Pengaturan Umum | 📊 Riwayat Aktivitas      │
├─────────────────────────────────────────────────┤
│                                                  │
│ [4 Anggota] [3 Dompet] [150 Transaksi]        │
│                                                  │
│ Informasi Umum                                   │
│ ┌─────────────────────────────────────────┐    │
│ │ Nama Keluarga *                          │    │
│ │ [Keluarga Budi________________]         │    │
│ └─────────────────────────────────────────┘    │
│                                                  │
│ Pengaturan Regional                              │
│ ┌──────────────┐ ┌──────────────┐              │
│ │ Mata Uang    │ │ Zona Waktu   │              │
│ │ [IDR ▼]      │ │ [WIB ▼]      │              │
│ └──────────────┘ └──────────────┘              │
│                                                  │
│ Notifikasi & Peringatan                          │
│ ☑ Peringatan Budget                             │
│ ☑ Pengingat Target                              │
│ ☐ Laporan Mingguan                              │
│ ☑ Laporan Bulanan                               │
│                                                  │
│ Threshold Peringatan Budget                      │
│ [========●===] 80%                              │
│                                                  │
│                    [Reset] [💾 Simpan]          │
└─────────────────────────────────────────────────┘
```

### Activity Timeline

```
┌─────────────────────────────────────────────────┐
│ Filter: [Semua Aksi ▼] [Semua Tipe ▼]         │
├─────────────────────────────────────────────────┤
│                                                  │
│ ● 💰 Transaksi Dibuat                 2 jam lalu│
│   oleh Budi Santoso                             │
│   amount: null → 50000                          │
│   [Transaction] clyyy...                        │
│                                                  │
│ ● ✏️ Budget Diubah                   5 jam lalu│
│   oleh Siti Rahayu                              │
│   amount: 500000 → 600000                       │
│   [Budget] clzzz...                             │
│                                                  │
│ ● 🎯 Target Dibuat                  kemarin     │
│   oleh Ahmad Fauzi                              │
│   [Goal] claaa...                               │
│                                                  │
│             [← Sebelumnya] [1] 2 3 [Berikutnya →]│
└─────────────────────────────────────────────────┘
```

---

## 🔐 Security & Permissions

### Family Settings API

- ✅ Requires authentication (JWT)
- ✅ GET: All family members can view
- ✅ PUT: Only ADMIN can update
- ✅ Creates audit log on changes
- ✅ Validates input data

### Activity Timeline API

- ✅ Requires authentication (JWT)
- ✅ Only shows family's own activities
- ✅ No permission to modify audit logs
- ✅ All family members can view

---

## 📊 Database Schema Updates

### Family Model (Updated)

```prisma
model Family {
  id          String   @id @default(cuid())
  name        String
  description String?

  // Settings & Preferences (NEW)
  currency         String  @default("IDR")
  timezone         String  @default("Asia/Jakarta")
  language         String  @default("id")
  dateFormat       String  @default("DD/MM/YYYY")
  budgetAlerts     Boolean @default(true)
  goalReminders    Boolean @default(true)
  weeklyReport     Boolean @default(false)
  monthlyReport    Boolean @default(true)
  emailNotif       Boolean @default(true)
  defaultBudgetAlert Float? @default(80)

  // Relations
  members       User[]
  wallets       Wallet[]
  categories    Category[]
  transactions  Transaction[]
  assets        Asset[]
  liabilities   Liability[]
  invites       FamilyInvite[]
  goals         Goal[]
  budgets       Budget[]
  auditLogs     AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Migration Required

```bash
pnpm prisma migrate dev --name add_family_preferences
```

---

## 🚀 Usage Examples

### Update Family Settings

```typescript
const response = await fetch("/api/family/settings", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    currency: "USD",
    budgetAlerts: true,
    defaultBudgetAlert: 75,
  }),
});

const { family } = await response.json();
```

### Fetch Activity Timeline

```typescript
const params = new URLSearchParams({
  page: "1",
  limit: "20",
  action: "CREATE_TRANSACTION",
  entityType: "Transaction",
});

const response = await fetch(`/api/family/activity?${params}`);
const { activities, pagination } = await response.json();
```

---

## ✅ Testing Checklist

### Settings Page

- [ ] Admin dapat melihat dan mengubah settings
- [ ] Member hanya dapat melihat (tidak bisa ubah)
- [ ] Form validation berfungsi
- [ ] Success message muncul setelah save
- [ ] Reset button mengembalikan data asli
- [ ] Statistics ditampilkan dengan benar

### Activity Timeline

- [ ] Activities ditampilkan dengan urutan terbaru
- [ ] Filter by action type berfungsi
- [ ] Filter by entity type berfungsi
- [ ] Pagination berfungsi
- [ ] Relative time ditampilkan dengan benar
- [ ] Changes diff ditampilkan
- [ ] Empty state ditampilkan jika tidak ada data

---

## 🔄 Future Enhancements

### Settings

- [ ] Export family data
- [ ] Delete family account
- [ ] Transfer ownership
- [ ] Custom categories preset
- [ ] Notification delivery preferences

### Activity Timeline

- [ ] Export activity logs (CSV/PDF)
- [ ] Advanced filtering (date range picker)
- [ ] Activity search
- [ ] User activity statistics
- [ ] Real-time activity feed
- [ ] Activity notifications

---

## 📝 Notes

1. **Database Migration**: Perlu menjalankan migration untuk menambahkan field baru ke Family model
2. **Default Values**: Semua settings memiliki default values yang sensible
3. **Audit Logging**: Setiap perubahan settings dicatat di audit log
4. **Responsive Design**: UI responsive untuk mobile dan desktop
5. **Access Control**: Settings hanya bisa diubah oleh Admin
6. **Activity Display**: Activity timeline menampilkan max 20 items per page

---

**Last Updated:** 29 November 2024
**Version:** 1.0.0
