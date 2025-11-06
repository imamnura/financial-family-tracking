'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import TransactionModal from '@/components/TransactionModal';
import CategoryPieChart from '@/components/CategoryPieChart';

interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  date: string;
  notes?: string | null;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  category: {
    id: string;
    name: string;
    icon?: string | null;
    type: 'INCOME' | 'EXPENSE';
  };
  wallet: {
    id: string;
    name: string;
  };
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
}

interface TransactionsResponse {
  transactions: Transaction[];
  summary: Summary;
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/transactions?limit=10');
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data transaksi');
      }

      const data: TransactionsResponse = await response.json();
      setTransactions(data.transactions);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransactionSuccess = () => {
    // Refresh transactions after adding new one
    fetchTransactions();
  };

  // Aggregate expense data by category
  const categoryData = useMemo(() => {
    const expenseTransactions = transactions.filter((t) => t.type === 'EXPENSE');
    
    if (expenseTransactions.length === 0) return [];

    // Group by category
    const categoryMap = new Map<string, { name: string; icon: string; total: number }>();
    
    expenseTransactions.forEach((transaction) => {
      const categoryId = transaction.category.id;
      const existing = categoryMap.get(categoryId);
      
      if (existing) {
        existing.total += transaction.amount;
      } else {
        categoryMap.set(categoryId, {
          name: transaction.category.name,
          icon: transaction.category.icon || '',
          total: transaction.amount,
        });
      }
    });

    // Convert to array and calculate percentages
    const totalExpense = summary.totalExpense;
    
    return Array.from(categoryMap.values())
      .map((cat) => ({
        name: cat.name,
        icon: cat.icon,
        value: cat.total,
        percentage: totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [transactions, summary.totalExpense]);

  // Format currency to IDR
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTransactionSuccess}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ringkasan keuangan keluarga Anda
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/export/transactions"
            download
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ekspor ke Excel
          </a>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pemasukan
            </span>
            <div className="w-10 h-10 rounded-full bg-income-light dark:bg-income-dark/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-income-dark dark:text-income-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-income-dark dark:text-income-light">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>

        {/* Expense Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pengeluaran
            </span>
            <div className="w-10 h-10 rounded-full bg-expense-light dark:bg-expense-dark/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-expense-dark dark:text-expense-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-expense-dark dark:text-expense-light">
            {formatCurrency(summary.totalExpense)}
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Saldo
            </span>
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-income-dark dark:text-income-light' : 'text-expense-dark dark:text-expense-light'}`}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
      </div>

      {/* Expense by Category Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pengeluaran per Kategori
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Distribusi pengeluaran berdasarkan kategori
          </p>
        </div>
        <div className="p-6">
          <CategoryPieChart data={categoryData} />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transaksi Terakhir
          </h2>
        </div>

        {/* Error State */}
        {error && (
          <div className="px-6 py-4 bg-danger-50 dark:bg-danger-900/20 border-b border-danger-200 dark:border-danger-800">
            <p className="text-sm text-danger-800 dark:text-danger-200 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="px-6 py-12 flex flex-col items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-primary-600 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">Memuat transaksi...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && transactions.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Belum ada transaksi
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Mulai catat transaksi keuangan keluarga Anda
            </p>
            <Link href="/transactions/new" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Transaksi Pertama
            </Link>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Deskripsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Anggota
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.description}
                      </div>
                      {transaction.notes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {transaction.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {transaction.category.icon && (
                          <span>{transaction.category.icon}</span>
                        )}
                        {transaction.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-medium">
                          {transaction.user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {transaction.user.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-semibold ${
                          transaction.type === 'INCOME'
                            ? 'text-income-dark dark:text-income-light'
                            : 'text-expense-dark dark:text-expense-light'
                        }`}
                      >
                        {transaction.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View All Link */}
        {!isLoading && !error && transactions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/transactions"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center justify-center gap-2"
            >
              Lihat Semua Transaksi
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
