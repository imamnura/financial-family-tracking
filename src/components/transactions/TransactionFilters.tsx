"use client";

import { useState, useEffect } from "react";
import DateRangePicker from "@/components/ui/DateRangePicker";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: "INCOME" | "EXPENSE";
}

interface Wallet {
  id: string;
  name: string;
}

interface Filters {
  type: "ALL" | "INCOME" | "EXPENSE";
  categoryId: string;
  walletId: string;
  startDate: string;
  endDate: string;
  search: string;
}

interface TransactionFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
}

export default function TransactionFilters({
  filters,
  onFilterChange,
}: TransactionFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchWallets();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets");
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets || []);
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error);
    }
  };

  // Filter categories by type
  const filteredCategories =
    filters.type === "ALL"
      ? categories
      : categories.filter((c) => c.type === filters.type);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      {/* Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tipe
        </label>
        <select
          value={filters.type}
          onChange={(e) =>
            onFilterChange({
              type: e.target.value as "ALL" | "INCOME" | "EXPENSE",
              categoryId: "", // Reset category when type changes
            })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="ALL">Semua</option>
          <option value="INCOME">Pemasukan</option>
          <option value="EXPENSE">Pengeluaran</option>
        </select>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Kategori
        </label>
        <select
          value={filters.categoryId}
          onChange={(e) => onFilterChange({ categoryId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Semua Kategori</option>
          {filteredCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Wallet Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Wallet
        </label>
        <select
          value={filters.walletId}
          onChange={(e) => onFilterChange({ walletId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Semua Wallet</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker
        startDate={filters.startDate}
        endDate={filters.endDate}
        onRangeChange={(start, end) =>
          onFilterChange({ startDate: start, endDate: end })
        }
        label="Periode"
        showPresets={true}
      />
    </div>
  );
}
