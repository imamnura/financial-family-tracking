"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "../ui";
import { formatCurrency } from "@/lib/utils";

interface SpendingTrendsProps {
  data: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
}

export function SpendingTrendsChart({ data }: SpendingTrendsProps) {
  return (
    <Card variant="elevated" padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Tren Pendapatan & Pengeluaran
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={2}
            name="Pemasukan"
            dot={{ fill: "#10b981" }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            strokeWidth={2}
            name="Pengeluaran"
            dot={{ fill: "#ef4444" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface CategoryBreakdownProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownProps) {
  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];

  return (
    <Card variant="elevated" padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Pengeluaran per Kategori
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} (${(percent * 100).toFixed(0)}%)`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface MonthlyComparisonProps {
  data: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
}

export function MonthlyComparisonChart({ data }: MonthlyComparisonProps) {
  return (
    <Card variant="elevated" padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Perbandingan Bulanan
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Pemasukan" />
          <Bar dataKey="expense" fill="#ef4444" name="Pengeluaran" />
          <Bar dataKey="net" fill="#3b82f6" name="Net" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface BudgetProgressProps {
  data: Array<{
    category: string;
    spent: number;
    budget: number;
    percentage: number;
  }>;
}

export function BudgetProgressChart({ data }: BudgetProgressProps) {
  return (
    <Card variant="elevated" padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Progress Anggaran
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            type="number"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            dataKey="category"
            type="category"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            width={100}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "percentage") return `${value}%`;
              return formatCurrency(value);
            }}
          />
          <Legend />
          <Bar dataKey="percentage" fill="#3b82f6" name="Penggunaan (%)" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-600 dark:text-gray-400">
              {item.category}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
