"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ChartExportButton from "@/components/ui/ChartExportButton";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: MonthlyData[];
  isLoading?: boolean;
}

export default function IncomeExpenseChart({
  data,
  isLoading = false,
}: IncomeExpenseChartProps) {
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format month label (YYYY-MM to MMM YYYY)
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat("id-ID", {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Transform data for chart
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    Pemasukan: item.income,
    Pengeluaran: item.expense,
  }));

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4"
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
          <p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Belum ada data</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        <XAxis
          dataKey="month"
          tick={{
            fill: "currentColor",
            className: "text-gray-600 dark:text-gray-400 text-xs",
          }}
          axisLine={{
            stroke: "currentColor",
            className: "stroke-gray-300 dark:stroke-gray-600",
          }}
        />
        <YAxis
          tick={{
            fill: "currentColor",
            className: "text-gray-600 dark:text-gray-400 text-xs",
          }}
          axisLine={{
            stroke: "currentColor",
            className: "stroke-gray-300 dark:stroke-gray-600",
          }}
          tickFormatter={(value) => {
            // Format to K/M/B
            if (value >= 1000000000)
              return `${(value / 1000000000).toFixed(1)}M`;
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
            return value.toString();
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--tooltip-bg)",
            border: "1px solid var(--tooltip-border)",
            borderRadius: "0.5rem",
          }}
          formatter={(value: number) => formatCurrency(value)}
          labelStyle={{ color: "var(--tooltip-text)", fontWeight: 600 }}
        />
        <Legend
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="rect"
          formatter={(value) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {value}
            </span>
          )}
        />
        <Bar dataKey="Pemasukan" fill="#10b981" radius={[8, 8, 0, 0]} />
        <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
