"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// Cache untuk menyimpan data yang sudah di-fetch
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "monthly" | "yearly" | "budget" | "insights"
  >("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [yearlyReport, setYearlyReport] = useState<any>(null);
  const [budgetComparison, setBudgetComparison] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, selectedYear, selectedMonth]);

  // Helper function untuk caching
  const getCachedData = useCallback((key: string) => {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((key: string, data: any) => {
    dataCache.set(key, { data, timestamp: Date.now() });
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case "monthly":
          await loadMonthlyReport();
          break;
        case "yearly":
          await loadYearlyReport();
          break;
        case "budget":
          await loadBudgetComparison();
          break;
        case "insights":
          await loadInsights();
          break;
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      setError(error.message || "Gagal memuat data. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    const cacheKey = `monthly-${selectedYear}-${selectedMonth}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setMonthlyReport(cached);
      return;
    }

    const res = await fetch(
      `/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    setMonthlyReport(data);
    setCachedData(cacheKey, data);
  };

  const loadYearlyReport = async () => {
    const cacheKey = `yearly-${selectedYear}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setYearlyReport(cached);
      return;
    }

    const res = await fetch(`/api/reports/yearly?year=${selectedYear}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    setYearlyReport(data);
    setCachedData(cacheKey, data);
  };

  const loadBudgetComparison = async () => {
    const cacheKey = `budget-${selectedYear}-${selectedMonth}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setBudgetComparison(cached);
      return;
    }

    const res = await fetch(
      `/api/reports/budget-comparison?year=${selectedYear}&month=${selectedMonth}`
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    setBudgetComparison(data);
    setCachedData(cacheKey, data);
  };

  const loadInsights = async () => {
    const cacheKey = `insights-3months`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setInsights(cached);
      return;
    }

    const res = await fetch(`/api/reports/insights?months=3`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    setInsights(data);
    setCachedData(cacheKey, data);
  };

  const handleExport = async (format: "pdf" | "excel", type: string) => {
    const startDate = new Date(selectedYear, selectedMonth - 1, 1)
      .toISOString()
      .split("T")[0];
    const endDate = new Date(selectedYear, selectedMonth, 0)
      .toISOString()
      .split("T")[0];

    const url = `/api/export/enhanced?format=${format}&type=${type}&startDate=${startDate}&endDate=${endDate}`;

    window.open(url, "_blank");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white animate-slideDown">
          📊 Laporan Keuangan
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 animate-slideDown animation-delay-100">
          Analisis mendalam keuangan keluarga Anda
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 animate-slideUp">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input-field transition-all hover:border-primary-400"
              disabled={loading}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          {(activeTab === "monthly" || activeTab === "budget") && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input-field transition-all hover:border-primary-400"
                disabled={loading}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(2025, i, 1);
                  return (
                    <option key={i + 1} value={i + 1}>
                      {date.toLocaleDateString("id-ID", { month: "long" })}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="flex items-end gap-2 ml-auto">
            <button
              onClick={() => handleExport("excel", "report")}
              className="btn-secondary flex items-center gap-2 transition-all hover:scale-105"
              disabled={loading}
            >
              <span>📥</span> Export Excel
            </button>
            <button
              onClick={() => handleExport("pdf", "report")}
              className="btn-secondary flex items-center gap-2 transition-all hover:scale-105"
              disabled={loading}
            >
              <span>📄</span> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "monthly", label: "Bulanan", icon: "📅" },
            { id: "yearly", label: "Tahunan", icon: "📆" },
            { id: "budget", label: "Budget vs Actual", icon: "🎯" },
            { id: "insights", label: "Insights", icon: "💡" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              disabled={loading}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all
                ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600 dark:text-primary-400 scale-105"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }
                ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 animate-fadeIn">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">
            Memuat data...
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 animate-shake">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-400">
                Terjadi Kesalahan
              </h3>
              <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 underline"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {activeTab === "monthly" && monthlyReport && (
            <MonthlyReportView
              report={monthlyReport}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "yearly" && yearlyReport && (
            <YearlyReportView
              report={yearlyReport}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "budget" && budgetComparison && (
            <BudgetComparisonView
              comparison={budgetComparison}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === "insights" && insights && (
            <InsightsView insights={insights} formatCurrency={formatCurrency} />
          )}

          {/* Empty State */}
          {activeTab === "monthly" && !monthlyReport && (
            <EmptyState message="Belum ada data laporan bulanan" />
          )}
          {activeTab === "yearly" && !yearlyReport && (
            <EmptyState message="Belum ada data laporan tahunan" />
          )}
          {activeTab === "budget" && !budgetComparison && (
            <EmptyState message="Belum ada data perbandingan budget" />
          )}
          {activeTab === "insights" && !insights && (
            <EmptyState message="Belum ada data insights" />
          )}
        </div>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
      <div className="text-6xl mb-4">📊</div>
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        Pilih periode yang berbeda atau tambahkan data baru
      </p>
    </div>
  );
}

// Color palette for charts
const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

// Monthly Report Component
function MonthlyReportView({ report, formatCurrency }: any) {
  // Prepare data for daily trend chart
  const dailyTrendData = report.dailyTrends.map((day: any) => ({
    date: new Date(day.date).getDate(),
    income: day.income,
    expense: day.expense,
    net: day.income - day.expense,
  }));

  // Prepare data for category pie chart
  const categoryPieData = report.categoryBreakdown.expenses
    .slice(0, 8)
    .map((cat: any, index: number) => ({
      name: cat.categoryName,
      value: cat.amount,
      percentage: cat.percentage,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow-md p-6 transform transition-all hover:scale-105 animate-slideUp">
          <div className="text-sm text-green-700 dark:text-green-400">
            💰 Total Pemasukan
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            {formatCurrency(report.summary.totalIncome)}
          </div>
          <div className="text-xs text-green-600 dark:text-green-500 mt-1">
            {report.summary.incomeTransactions} transaksi
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg shadow-md p-6 transform transition-all hover:scale-105 animate-slideUp animation-delay-100">
          <div className="text-sm text-red-700 dark:text-red-400">
            💸 Total Pengeluaran
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
            {formatCurrency(report.summary.totalExpense)}
          </div>
          <div className="text-xs text-red-600 dark:text-red-500 mt-1">
            {report.summary.expenseTransactions} transaksi
          </div>
        </div>

        <div
          className={`bg-gradient-to-br ${
            report.summary.netSavings >= 0
              ? "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
              : "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
          } rounded-lg shadow-md p-6 transform transition-all hover:scale-105 animate-slideUp animation-delay-200`}
        >
          <div
            className={`text-sm ${
              report.summary.netSavings >= 0
                ? "text-blue-700 dark:text-blue-400"
                : "text-orange-700 dark:text-orange-400"
            }`}
          >
            🎯 Net Savings
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              report.summary.netSavings >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-orange-600 dark:text-orange-400"
            }`}
          >
            {formatCurrency(report.summary.netSavings)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg shadow-md p-6 transform transition-all hover:scale-105 animate-slideUp animation-delay-300">
          <div className="text-sm text-purple-700 dark:text-purple-400">
            📈 Savings Rate
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {report.summary.savingsRate.toFixed(1)}%
          </div>
          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mt-2">
            <div
              className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(report.summary.savingsRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-slideUp animation-delay-400">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> Tren Harian
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrendData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.1}
              />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorIncome)"
                name="Pemasukan"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorExpense)"
                name="Pengeluaran"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-slideUp animation-delay-500">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🎨</span> Distribusi Pengeluaran
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.percentage.toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryPieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-slideUp animation-delay-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📂</span> Pengeluaran per Kategori
          </h3>
          <div className="space-y-3">
            {report.categoryBreakdown.expenses
              .slice(0, 5)
              .map((cat: any, idx: number) => (
                <div
                  key={cat.categoryId}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                      {cat.categoryName}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {cat.percentage.toFixed(1)}% • {cat.count} transaksi
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-slideUp animation-delay-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🔥</span> Top 5 Pengeluaran
          </h3>
          <div className="space-y-3">
            {report.topExpenses.slice(0, 5).map((tx: any, idx: number) => (
              <div
                key={tx.id}
                className="flex justify-between items-start border-b border-gray-200 dark:border-gray-700 pb-3 animate-fadeIn hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-all"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div>
                  <div className="font-medium text-sm">{tx.description}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(tx.date).toLocaleDateString("id-ID")} •{" "}
                    {tx.category}
                  </div>
                </div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Yearly Report Component
function YearlyReportView({ report, formatCurrency }: any) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Pemasukan
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-2">
            {formatCurrency(report.summary.totalIncome)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Pengeluaran
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-2">
            {formatCurrency(report.summary.totalExpense)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Net Savings
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {formatCurrency(report.summary.netSavings)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Avg Monthly Income
          </div>
          <div className="text-xl font-bold mt-2">
            {formatCurrency(report.summary.avgMonthlyIncome)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Savings Rate
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {report.summary.savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Breakdown Bulanan</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 text-sm font-medium">Bulan</th>
                <th className="text-right py-2 text-sm font-medium">
                  Pemasukan
                </th>
                <th className="text-right py-2 text-sm font-medium">
                  Pengeluaran
                </th>
                <th className="text-right py-2 text-sm font-medium">Net</th>
                <th className="text-right py-2 text-sm font-medium">
                  Savings Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {report.monthlyBreakdown.map((month: any) => (
                <tr
                  key={month.month}
                  className="border-b border-gray-100 dark:border-gray-700"
                >
                  <td className="py-2 text-sm">{month.monthName}</td>
                  <td className="py-2 text-sm text-right text-green-600">
                    {formatCurrency(month.income)}
                  </td>
                  <td className="py-2 text-sm text-right text-red-600">
                    {formatCurrency(month.expense)}
                  </td>
                  <td
                    className={`py-2 text-sm text-right font-medium ${
                      month.net >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(month.net)}
                  </td>
                  <td className="py-2 text-sm text-right">
                    {month.savingsRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Budget Comparison Component
function BudgetComparisonView({ comparison, formatCurrency }: any) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "good":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/20";
      case "warning":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
      case "over":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/20";
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Budget
          </div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(comparison.summary.totalBudget)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Actual
          </div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(comparison.summary.totalActual)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Variance
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              comparison.summary.totalVariance < 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formatCurrency(Math.abs(comparison.summary.totalVariance))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Utilization
          </div>
          <div className="text-2xl font-bold mt-2">
            {comparison.summary.overallUtilization.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Comparisons Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Detail Perbandingan</h3>
        <div className="space-y-4">
          {comparison.comparisons.map((comp: any) => (
            <div
              key={comp.budgetId}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">{comp.categoryName}</h4>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(
                      comp.status
                    )}`}
                  >
                    {comp.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {comp.transactionCount} transaksi
                  </div>
                  {comp.trend !== "stable" && (
                    <div
                      className={`text-xs ${
                        comp.trend === "up" ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {comp.trend === "up" ? "↑" : "↓"}{" "}
                      {Math.abs(comp.trendPercentage).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Budget</div>
                  <div className="font-medium">
                    {formatCurrency(comp.budget)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Actual</div>
                  <div className="font-medium">
                    {formatCurrency(comp.actual)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Variance</div>
                  <div
                    className={`font-medium ${
                      comp.variance < 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(comp.variance))}
                  </div>
                </div>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    comp.utilizationRate > 100
                      ? "bg-red-500"
                      : comp.utilizationRate > 90
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(comp.utilizationRate, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Utilization: {comp.utilizationRate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast (if available) */}
      {comparison.forecast && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Forecast</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current Spending
              </div>
              <div className="font-medium">
                {formatCurrency(comparison.forecast.currentSpending)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Projected Total
              </div>
              <div className="font-medium">
                {formatCurrency(comparison.forecast.projectedTotal)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Days Remaining
              </div>
              <div className="font-medium">
                {comparison.forecast.daysRemaining} hari
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Status
              </div>
              <div
                className={`font-medium ${
                  comparison.forecast.onTrack
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {comparison.forecast.onTrack ? "✓ On Track" : "⚠ Over Budget"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Insights Component
function InsightsView({ insights, formatCurrency }: any) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "low":
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      default:
        return "";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-100 dark:bg-red-900/20";
      case "medium":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
      case "low":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/20";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
        <h3 className="text-2xl font-bold mb-2">Financial Health Score</h3>
        <div className="flex items-center gap-4">
          <div className="text-6xl font-bold">
            {insights.healthScore.score}
            <span className="text-3xl">/100</span>
          </div>
          <div>
            <div className="text-xl font-semibold">
              {insights.healthScore.rating}
            </div>
            <div className="text-sm opacity-90">
              Based on {insights.period.monthsAnalyzed} months of data
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(insights.healthScore.breakdown).map(
            ([key, value]: [string, any]) => (
              <div key={key} className="bg-white/20 rounded p-3">
                <div className="text-xs opacity-80">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <div className="font-semibold">
                  {value.score}/{value.maxScore}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Recommendations
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {insights.summary.totalRecommendations}
          </div>
          <div className="text-xs text-gray-500">
            {insights.summary.highPriorityRecommendations} high priority
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Anomalies Detected
          </div>
          <div className="text-2xl font-bold text-yellow-600 mt-2">
            {insights.summary.totalAnomalies}
          </div>
          <div className="text-xs text-gray-500">
            {insights.summary.criticalAnomalies} critical
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Potential Savings
          </div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(insights.summary.potentialMonthlySavings)}
          </div>
          <div className="text-xs text-gray-500">per month</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Next Month Forecast
          </div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(insights.predictions.nextMonth.predictedSavings)}
          </div>
          <div className="text-xs text-gray-500">
            {insights.predictions.nextMonth.confidence} confidence
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">💡 Recommendations</h3>
        <div className="space-y-3">
          {insights.recommendations
            .slice(0, 5)
            .map((rec: any, index: number) => (
              <div
                key={index}
                className={`border-l-4 rounded-r-lg p-4 ${getPriorityColor(
                  rec.priority
                )}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold">{rec.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {rec.description}
                    </div>
                    {rec.potentialSavings && (
                      <div className="text-sm font-medium text-green-600 mt-2">
                        💰 Potential savings:{" "}
                        {formatCurrency(rec.potentialSavings)}
                      </div>
                    )}
                  </div>
                  <span
                    className={`ml-4 px-3 py-1 rounded text-xs font-medium ${
                      rec.priority === "high"
                        ? "bg-red-200 text-red-800"
                        : rec.priority === "medium"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Anomalies */}
      {insights.anomalies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">⚠️ Anomalies</h3>
          <div className="space-y-3">
            {insights.anomalies.map((anomaly: any, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(
                    anomaly.severity
                  )}`}
                >
                  {anomaly.severity.toUpperCase()}
                </span>
                <div className="flex-1">
                  <div className="text-sm">{anomaly.description}</div>
                  {anomaly.date && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(anomaly.date).toLocaleDateString("id-ID")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings Opportunities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">💰 Savings Opportunities</h3>
        <div className="space-y-3">
          {insights.savingsOpportunities.map((opp: any, index: number) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold">{opp.category}</div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    opp.difficulty === "easy"
                      ? "bg-green-100 text-green-800"
                      : opp.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {opp.difficulty}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {opp.description}
              </div>
              <div className="flex justify-between text-sm">
                <span>Current: {formatCurrency(opp.currentSpending)}</span>
                <span className="font-semibold text-green-600">
                  Save: {formatCurrency(opp.potentialSavings)}/mo
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
