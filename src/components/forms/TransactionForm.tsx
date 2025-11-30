"use client";

import { useState, useEffect } from "react";
import { useZodForm } from "@/hooks/useZodForm";
import { transactionSchema } from "@/lib/validation";
import type { TransactionInput } from "@/lib/validation";
import { analytics } from "@/lib/monitoring";
import { toast } from "@/store/useNotificationStore";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
}

interface Wallet {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Enhanced Transaction Form with Zod Validation
 */
export function TransactionForm({ onSuccess, onCancel }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
    setValue,
  } = useZodForm(transactionSchema, {
    defaultValues: {
      type: "EXPENSE",
      date: new Date(),
    },
  });

  const transactionType = watch("type");

  // Load categories and wallets
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);

        // Load categories
        const categoriesRes = await fetch("/api/categories");
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }

        // Load wallets
        const walletsRes = await fetch("/api/wallets");
        if (walletsRes.ok) {
          const walletsData = await walletsRes.json();
          setWallets(walletsData.wallets || []);
        }
      } catch (error) {
        console.error("Error loading form data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  const onSubmit = async (data: TransactionInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menambah transaksi");
      }

      // Track event
      analytics.trackFormSubmit("Add Transaction", true);
      analytics.trackFeatureUsage("Transaction", "Create");

      // Show success notification
      toast.success("Transaksi berhasil ditambahkan!");

      // Call success callback
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast.error(error.message || "Gagal menambah transaksi");
      analytics.trackFormSubmit("Add Transaction", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tipe Transaksi
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setValue("type", "INCOME")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              transactionType === "INCOME"
                ? "bg-green-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            💰 Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setValue("type", "EXPENSE")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              transactionType === "EXPENSE"
                ? "bg-red-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            💸 Pengeluaran
          </button>
        </div>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.type.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Deskripsi <span className="text-red-500">*</span>
        </label>
        <input
          {...register("description")}
          type="text"
          placeholder="Contoh: Belanja bulanan"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors.description
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Jumlah <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            Rp
          </span>
          <input
            {...register("amount", { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0"
            className={`w-full pl-12 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.amount
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            disabled={isSubmitting}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.amount.message}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Kategori <span className="text-red-500">*</span>
        </label>
        <select
          {...register("categoryId")}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors.categoryId
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          disabled={isSubmitting || loadingData}
        >
          <option value="">
            {loadingData ? "Loading..." : "Pilih Kategori"}
          </option>
          {categories
            .filter((cat) => cat.type === transactionType)
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      {/* Wallet */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Wallet <span className="text-red-500">*</span>
        </label>
        <select
          {...register("walletId")}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors.walletId
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          disabled={isSubmitting || loadingData}
        >
          <option value="">
            {loadingData ? "Loading..." : "Pilih Wallet"}
          </option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name} (Rp {wallet.balance.toLocaleString("id-ID")})
            </option>
          ))}
        </select>
        {errors.walletId && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.walletId.message}
          </p>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tanggal <span className="text-red-500">*</span>
        </label>
        <input
          {...register("date", { valueAsDate: true })}
          type="date"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors.date
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          disabled={isSubmitting}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.date.message}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Catatan (Opsional)
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Tambahkan catatan tambahan..."
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none ${
            errors.notes
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          disabled={isSubmitting}
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.notes.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
