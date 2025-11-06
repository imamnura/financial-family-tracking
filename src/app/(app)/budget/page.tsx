'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CategoryBudget {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  budget: number | null;
  budgetId: string | null;
  realization: number;
  percentage: number;
  actualPercentage: number;
  status: 'over' | 'warning' | 'safe' | 'no-budget';
}

interface BudgetStatus {
  month: number;
  year: number;
  categories: CategoryBudget[];
  totalBudget: number;
  totalRealization: number;
  totalPercentage: number;
}

export default function BudgetPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    fetchBudgetStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const fetchBudgetStatus = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/budget/status?month=${month}&year=${year}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data budget');
      }

      setBudgetStatus(data);

      // Initialize edit values
      const values: Record<string, string> = {};
      data.categories.forEach((cat: CategoryBudget) => {
        values[cat.id] = cat.budget?.toString() || '';
      });
      setEditValues(values);
    } catch (err) {
      console.error('Fetch budget error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (categoryId: string) => {
    const amount = parseFloat(editValues[categoryId] || '0');

    if (isNaN(amount) || amount < 0) {
      setError('Jumlah budget tidak valid');
      return;
    }

    setSaving(categoryId);
    setError('');

    try {
      const response = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount,
          month,
          year,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan budget');
      }

      // Refresh data
      await fetchBudgetStatus();
    } catch (err) {
      console.error('Save budget error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSaving(null);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return months[monthNum - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return 'bg-success-500';
      case 'warning':
        return 'bg-warning-500';
      case 'over':
        return 'bg-danger-500';
      default:
        return 'bg-secondary-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'safe':
        return 'Aman';
      case 'warning':
        return 'Mendekati Limit';
      case 'over':
        return 'Melebihi Budget';
      default:
        return 'Belum Ada Budget';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Budgeting
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola budget pengeluaran per kategori
        </p>
      </div>

      {/* Month/Year Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="px-4 py-2 bg-secondary-100 dark:bg-secondary-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
          >
            ← Bulan Sebelumnya
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getMonthName(month)} {year}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Periode Budget
            </p>
          </div>

          <button
            onClick={handleNextMonth}
            className="px-4 py-2 bg-secondary-100 dark:bg-secondary-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
          >
            Bulan Berikutnya →
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {budgetStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Budget
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(budgetStatus.totalBudget)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Pengeluaran
                </p>
                <p className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                  {formatCurrency(budgetStatus.totalRealization)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">📤</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Sisa Budget
                </p>
                <p
                  className={`text-2xl font-bold ${
                    budgetStatus.totalBudget - budgetStatus.totalRealization >= 0
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-danger-600 dark:text-danger-400'
                  }`}
                >
                  {formatCurrency(budgetStatus.totalBudget - budgetStatus.totalRealization)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">💵</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <p className="text-sm text-danger-800 dark:text-danger-200">{error}</p>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Budget per Kategori
          </h3>
        </div>

        {budgetStatus && budgetStatus.categories.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Belum Ada Kategori
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Buat kategori pengeluaran terlebih dahulu
            </p>
          </div>
        )}

        {budgetStatus && budgetStatus.categories.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {budgetStatus.categories.map((category) => (
              <div key={category.id} className="p-6">
                {/* Category Header */}
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">{category.icon || '📁'}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.type === 'EXPENSE' ? 'Pengeluaran' : 'Pemasukan'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      category.status === 'safe'
                        ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-100'
                        : category.status === 'warning'
                        ? 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-100'
                        : category.status === 'over'
                        ? 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-100'
                        : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-100'
                    }`}
                  >
                    {getStatusText(category.status)}
                  </span>
                </div>

                {/* Budget Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Budget Bulan Ini
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editValues[category.id] || ''}
                        onChange={(e) =>
                          setEditValues({ ...editValues, [category.id]: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        min="0"
                        step="1000"
                      />
                      <button
                        onClick={() => handleSaveBudget(category.id)}
                        disabled={saving === category.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving === category.id ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Simpan
                          </span>
                        ) : (
                          'Simpan'
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Realisasi Pengeluaran
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(category.realization)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {category.budget && category.budget > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatCurrency(category.realization)} / {formatCurrency(category.budget)}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {category.actualPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full ${getStatusColor(category.status)} transition-all duration-300`}
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
