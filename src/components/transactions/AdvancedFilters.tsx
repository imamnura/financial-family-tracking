"use client";

import React from "react";
import { Input, Select } from "../ui";
import {
  Calendar,
  DollarSign,
  Tag,
  Wallet as WalletIcon,
  X,
} from "lucide-react";

export interface TransactionFilters {
  searchQuery: string;
  type: "ALL" | "INCOME" | "EXPENSE";
  categoryId: string;
  walletId: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

interface AdvancedFiltersProps {
  filters: TransactionFilters;
  onFilterChange: (filters: TransactionFilters) => void;
  categories: Array<{ id: string; name: string; type: "INCOME" | "EXPENSE" }>;
  wallets: Array<{ id: string; name: string }>;
}

export default function AdvancedFilters({
  filters,
  onFilterChange,
  categories,
  wallets,
}: AdvancedFiltersProps) {
  const updateFilter = (key: keyof TransactionFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      searchQuery: "",
      type: "ALL",
      categoryId: "",
      walletId: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    });
  };

  const hasActiveFilters =
    filters.categoryId ||
    filters.walletId ||
    filters.startDate ||
    filters.endDate ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.type !== "ALL";

  // Filter categories based on selected type
  const filteredCategories =
    filters.type === "ALL"
      ? categories
      : categories.filter((cat) => cat.type === filters.type);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Filter Transaksi
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <X className="w-3 h-3" />
            Hapus Filter
          </button>
        )}
      </div>

      {/* Type Filter */}
      <Select
        label="Tipe Transaksi"
        value={filters.type}
        onChange={(e) =>
          updateFilter("type", e.target.value as TransactionFilters["type"])
        }
        options={[
          { value: "ALL", label: "Semua Transaksi" },
          { value: "INCOME", label: "Pemasukan" },
          { value: "EXPENSE", label: "Pengeluaran" },
        ]}
      />

      {/* Category Filter */}
      <Select
        label="Kategori"
        value={filters.categoryId}
        onChange={(e) => updateFilter("categoryId", e.target.value)}
        options={[
          { value: "", label: "Semua Kategori" },
          ...filteredCategories.map((cat) => ({
            value: cat.id,
            label: cat.name,
          })),
        ]}
      />

      {/* Wallet Filter */}
      <Select
        label="Dompet"
        value={filters.walletId}
        onChange={(e) => updateFilter("walletId", e.target.value)}
        options={[
          { value: "", label: "Semua Dompet" },
          ...wallets.map((wallet) => ({
            value: wallet.id,
            label: wallet.name,
          })),
        ]}
      />

      {/* Date Range */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Rentang Tanggal
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            placeholder="Dari"
            value={filters.startDate}
            onChange={(e) => updateFilter("startDate", e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
          <Input
            type="date"
            placeholder="Sampai"
            value={filters.endDate}
            onChange={(e) => updateFilter("endDate", e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Amount Range */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Rentang Jumlah
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minAmount}
            onChange={(e) => updateFilter("minAmount", e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxAmount}
            onChange={(e) => updateFilter("maxAmount", e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Filter aktif:{" "}
            {[
              filters.type !== "ALL" && "Tipe",
              filters.categoryId && "Kategori",
              filters.walletId && "Dompet",
              (filters.startDate || filters.endDate) && "Tanggal",
              (filters.minAmount || filters.maxAmount) && "Jumlah",
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
