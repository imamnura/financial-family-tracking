"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import QuickActions from "@/components/dashboard/QuickActions";
import BudgetProgress from "@/components/dashboard/BudgetProgress";
import IncomeExpenseChart from "@/components/charts/IncomeExpenseChart";
import CategoryBreakdownChart from "@/components/charts/CategoryBreakdownChart";
import MonthlyTrendChart from "@/components/charts/MonthlyTrendChart";
import ChartExportButton from "@/components/ui/ChartExportButton";
import TransactionModal from "@/components/TransactionModal";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
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
    type: "INCOME" | "EXPENSE";
  };
  fromWallet: {
    id: string;
    name: string;
  } | null;
}

interface DashboardStats {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    incomeCount: number;
    expenseCount: number;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    amount: number;
    percentage: number;
  }>;
  budgetStatus: Array<{
    budgetId: string;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    budgetAmount: number;
    spent: number;
    remaining: number;
    percentage: number;
    actualPercentage: number;
    status: "on_track" | "warning" | "exceeded";
  }>;
  netWorth: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  recentTransactions: Transaction[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch dashboard stats on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/stats");

      if (!response.ok) {
        throw new Error("Gagal mengambil data dashboard");
      }

      const data: DashboardStats = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransactionSuccess = () => {
    // Refresh dashboard after adding new transaction
    fetchDashboardStats();
  };

  // Format currency to IDR
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
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
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Tambah Transaksi
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Pemasukan"
          value={stats ? formatCurrency(stats.summary.totalIncome) : "..."}
          icon={TrendingUp}
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
          valueColor="text-green-600 dark:text-green-400"
          subtitle={stats ? `${stats.summary.incomeCount} transaksi` : ""}
          isLoading={isLoading}
        />
        <StatsCard
          title="Pengeluaran"
          value={stats ? formatCurrency(stats.summary.totalExpense) : "..."}
          icon={TrendingDown}
          iconBgColor="bg-red-50 dark:bg-red-900/20"
          iconColor="text-red-600 dark:text-red-400"
          valueColor="text-red-600 dark:text-red-400"
          subtitle={stats ? `${stats.summary.expenseCount} transaksi` : ""}
          isLoading={isLoading}
        />
        <StatsCard
          title="Saldo"
          value={stats ? formatCurrency(stats.summary.balance) : "..."}
          icon={Wallet}
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-600 dark:text-blue-400"
          valueColor={
            stats && stats.summary.balance >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }
          subtitle="Bulan ini"
          isLoading={isLoading}
        />
        <StatsCard
          title="Kekayaan Bersih"
          value={stats ? formatCurrency(stats.netWorth.netWorth) : "..."}
          icon={DollarSign}
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          iconColor="text-purple-600 dark:text-purple-400"
          valueColor="text-purple-600 dark:text-purple-400"
          subtitle="Aset - Liabilitas"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Chart (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Trend Pemasukan & Pengeluaran
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  6 bulan terakhir
                </p>
              </div>
              <ChartExportButton
                chartId="income-expense-chart"
                filename="income-expense-trend.png"
              />
            </div>
            <div className="p-6" id="income-expense-chart">
              <IncomeExpenseChart
                data={stats?.monthlyTrend || []}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions (1/3 width) */}
        <div>
          <QuickActions
            onAddTransaction={() => setIsModalOpen(true)}
            onTransfer={() => router.push("/wallets")}
            onCreateBudget={() => router.push("/budget")}
            onViewGoals={() => router.push("/goals")}
          />
        </div>
      </div>

      {/* Category Breakdown & Budget Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pengeluaran per Kategori
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Distribusi pengeluaran bulan ini
              </p>
            </div>
            <ChartExportButton
              chartId="category-breakdown-chart"
              filename="category-breakdown.png"
            />
          </div>
          <div className="p-6" id="category-breakdown-chart">
            <CategoryBreakdownChart
              data={stats?.categoryBreakdown || []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Status Budget
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Perkembangan budget bulan ini
            </p>
          </div>
          <div className="p-6">
            <BudgetProgress
              budgets={stats?.budgetStatus || []}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trend Bulanan
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Perbandingan pemasukan, pengeluaran, dan saldo
            </p>
          </div>
          <ChartExportButton
            chartId="monthly-trend-chart"
            filename="monthly-trend.png"
          />
        </div>
        <div className="p-6" id="monthly-trend-chart">
          <MonthlyTrendChart
            data={stats?.monthlyTrend || []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transaksi Terakhir
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              10 transaksi terbaru
            </p>
          </div>
          <button
            onClick={() => router.push("/transactions")}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Lihat Semua →
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="px-6 py-12 flex flex-col items-center justify-center">
            <svg
              className="animate-spin h-8 w-8 text-primary-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">
              Memuat transaksi...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && stats && stats.recentTransactions.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Belum ada transaksi
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Mulai catat transaksi keuangan keluarga Anda
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tambah Transaksi Pertama
            </button>
          </div>
        )}

        {/* Transactions Table */}
        {!isLoading && stats && stats.recentTransactions.length > 0 && (
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
                {stats.recentTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
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
                          transaction.type === "INCOME"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
