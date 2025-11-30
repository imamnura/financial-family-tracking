/**
 * Validation Schemas using Zod
 * Centralized validation for all forms in the application
 */

import { z } from "zod";

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().min(1, "Email harus diisi").email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter"),
    email: z.string().min(1, "Email harus diisi").email("Email tidak valid"),
    password: z
      .string()
      .min(6, "Password minimal 6 karakter")
      .max(100, "Password maksimal 100 karakter")
      .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
      .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil")
      .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama harus diisi"),
    newPassword: z
      .string()
      .min(6, "Password minimal 6 karakter")
      .max(100, "Password maksimal 100 karakter")
      .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
      .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil")
      .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

// ============================================================================
// Profile Schemas
// ============================================================================

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().min(1, "Email harus diisi").email("Email tidak valid"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9+\-\s()]*$/.test(val),
      "Format nomor telepon tidak valid"
    ),
  address: z.string().max(500, "Alamat maksimal 500 karakter").optional(),
});

// ============================================================================
// Transaction Schemas
// ============================================================================

export const transactionSchema = z.object({
  description: z
    .string()
    .min(1, "Deskripsi harus diisi")
    .max(200, "Deskripsi maksimal 200 karakter"),
  amount: z
    .number()
    .positive("Jumlah harus lebih dari 0")
    .max(1000000000, "Jumlah terlalu besar"),
  type: z.enum(["INCOME", "EXPENSE"], {
    errorMap: () => ({ message: "Tipe harus Income atau Expense" }),
  }),
  categoryId: z.string().min(1, "Kategori harus dipilih"),
  walletId: z.string().min(1, "Wallet harus dipilih"),
  date: z.date({
    errorMap: () => ({ message: "Tanggal tidak valid" }),
  }),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export const transactionFilterSchema = z
  .object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    categoryId: z.string().optional(),
    walletId: z.string().optional(),
    search: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "Tanggal mulai harus sebelum tanggal akhir",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.minAmount && data.maxAmount) {
        return data.minAmount <= data.maxAmount;
      }
      return true;
    },
    {
      message: "Jumlah minimal harus lebih kecil dari jumlah maksimal",
      path: ["maxAmount"],
    }
  );

// ============================================================================
// Budget Schemas
// ============================================================================

export const budgetSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nama budget harus diisi")
      .max(100, "Nama budget maksimal 100 karakter"),
    amount: z
      .number()
      .positive("Jumlah harus lebih dari 0")
      .max(1000000000, "Jumlah terlalu besar"),
    categoryId: z.string().min(1, "Kategori harus dipilih"),
    period: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"], {
      errorMap: () => ({ message: "Periode tidak valid" }),
    }),
    startDate: z.date({
      errorMap: () => ({ message: "Tanggal mulai tidak valid" }),
    }),
    endDate: z.date({
      errorMap: () => ({ message: "Tanggal akhir tidak valid" }),
    }),
    alertThreshold: z
      .number()
      .min(0, "Threshold minimal 0")
      .max(100, "Threshold maksimal 100")
      .optional(),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "Tanggal mulai harus sebelum tanggal akhir",
    path: ["endDate"],
  });

// ============================================================================
// Category & Wallet Schemas
// ============================================================================

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nama kategori harus diisi")
    .max(50, "Nama kategori maksimal 50 karakter"),
  type: z.enum(["INCOME", "EXPENSE"], {
    errorMap: () => ({ message: "Tipe harus Income atau Expense" }),
  }),
  icon: z.string().max(10, "Icon maksimal 10 karakter").optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Format warna tidak valid (gunakan hex)")
    .optional(),
});

export const walletSchema = z.object({
  name: z
    .string()
    .min(1, "Nama wallet harus diisi")
    .max(50, "Nama wallet maksimal 50 karakter"),
  balance: z
    .number()
    .min(0, "Saldo tidak boleh negatif")
    .max(1000000000, "Saldo terlalu besar"),
  type: z.enum(["CASH", "BANK", "E_WALLET", "INVESTMENT"], {
    errorMap: () => ({ message: "Tipe wallet tidak valid" }),
  }),
  icon: z.string().max(10, "Icon maksimal 10 karakter").optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Format warna tidak valid (gunakan hex)")
    .optional(),
});

// ============================================================================
// Family Schemas
// ============================================================================

export const inviteMemberSchema = z.object({
  email: z.string().min(1, "Email harus diisi").email("Email tidak valid"),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string().min(1, "User ID harus diisi"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"], {
    errorMap: () => ({ message: "Role tidak valid" }),
  }),
});

export const familySettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Nama keluarga minimal 2 karakter")
    .max(100, "Nama keluarga maksimal 100 karakter"),
  currency: z.string().length(3, "Kode mata uang harus 3 karakter").optional(),
  timezone: z.string().optional(),
});

// ============================================================================
// Settings Schemas
// ============================================================================

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"], {
    errorMap: () => ({ message: "Theme tidak valid" }),
  }),
  language: z.enum(["id", "en"], {
    errorMap: () => ({ message: "Bahasa tidak valid" }),
  }),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    budget: z.boolean(),
    transaction: z.boolean(),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type WalletInput = z.infer<typeof walletSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type FamilySettingsInput = z.infer<typeof familySettingsSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
