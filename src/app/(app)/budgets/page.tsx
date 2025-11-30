"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Download,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  EmptyState,
  Loading,
  Alert,
} from "@/components/ui";
import BudgetCard from "@/components/budget/BudgetCard";
import CreateBudgetModal from "@/components/budget/CreateBudgetModal";
import EditBudgetModal from "@/components/budget/EditBudgetModal";
import ExportBudgetModal from "@/components/budget/ExportBudgetModal";
import BudgetRecommendations from "@/components/budget/BudgetRecommendations";
import { formatCurrency } from "@/lib/utils";

interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number;
  category: {
    id: string;
    name: string;
    icon: string | null;
    type: "INCOME" | "EXPENSE";
  };
  spent?: number;
  percentage?: number;
  status?: "SAFE" | "WARNING" | "DANGER" | "EXCEEDED";
}

interface BudgetStatus {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentage: number;
  budgetCount: number;
  onTrackCount: number;
  warningCount: number;
  exceededCount: number;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<{
    id: string;
    categoryId: string;
    amount: number;
    month: number;
  } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return parseInt(
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    );
  });

  useEffect(() => {
    fetchBudgets();
    fetchBudgetStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/budget?month=${selectedMonth}`);
      if (!response.ok) throw new Error("Failed to fetch budgets");

      const data = await response.json();
      setBudgets(data.budgets || data || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBudgetStatus = async () => {
    try {
      const response = await fetch(`/api/budget/status?month=${selectedMonth}`);
      if (!response.ok) throw new Error("Failed to fetch budget status");

      const data = await response.json();
      setBudgetStatus(data);
    } catch (error) {
      console.error("Error fetching budget status:", error);
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const year = Math.floor(selectedMonth / 100);
    const month = selectedMonth % 100;

    let newYear = year;
    let newMonth = month;

    if (direction === "prev") {
      newMonth = month - 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear = year - 1;
      }
    } else {
      newMonth = month + 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear = year + 1;
      }
    }

    setSelectedMonth(newYear * 100 + newMonth);
  };

  const formatMonthYear = (monthInt: number) => {
    const year = Math.floor(monthInt / 100);
    const month = monthInt % 100;
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  const getStatusColor = () => {
    if (!budgetStatus) return "success";
    if (budgetStatus.percentage >= 90) return "danger";
    if (budgetStatus.percentage >= 75) return "warning";
    return "success";
  };

  const handleEdit = (budget: {
    id: string;
    categoryId: string;
    amount: number;
    month: number;
  }) => {
    setSelectedBudget(budget);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedBudget(null);
    fetchBudgets();
    fetchBudgetStatus();
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
                Budget Management
              </h1>
              <p className="mt-2 text-secondary-600 dark:text-secondary-400">
                Track and manage your monthly budgets
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => setIsExportModalOpen(true)}
              >
                Export
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Budget
              </Button>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <Card variant="elevated" padding="md" className="mb-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange("prev")}
            >
              ← Previous
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
                {formatMonthYear(selectedMonth)}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange("next")}
            >
              Next →
            </Button>
          </div>
        </Card>

        {/* Budget Overview */}
        {budgetStatus && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Total Budget Progress */}
            <Card variant="elevated" padding="lg" className="lg:col-span-2">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                    Overall Budget
                  </h3>
                  <Badge variant={getStatusColor()}>
                    {budgetStatus.percentage.toFixed(1)}% Used
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-6 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      budgetStatus.percentage >= 90
                        ? "bg-gradient-to-r from-danger-500 to-danger-600"
                        : budgetStatus.percentage >= 75
                        ? "bg-gradient-to-r from-warning-500 to-warning-600"
                        : "bg-gradient-to-r from-success-500 to-success-600"
                    }`}
                    style={{
                      width: `${Math.min(budgetStatus.percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                    Total Budget
                  </p>
                  <p className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                    {formatCurrency(budgetStatus.totalBudget)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                    Total Spent
                  </p>
                  <p className="text-lg font-semibold text-danger-600 dark:text-danger-400">
                    {formatCurrency(budgetStatus.totalSpent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                    Remaining
                  </p>
                  <p
                    className={`text-lg font-semibold ${
                      budgetStatus.totalRemaining >= 0
                        ? "text-success-600 dark:text-success-400"
                        : "text-danger-600 dark:text-danger-400"
                    }`}
                  >
                    {formatCurrency(budgetStatus.totalRemaining)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Budget Summary */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                Budget Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-success-600 dark:text-success-400" />
                    </div>
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                      On Track
                    </span>
                  </div>
                  <span className="font-semibold text-secondary-900 dark:text-secondary-100">
                    {budgetStatus.onTrackCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                    </div>
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                      Warning
                    </span>
                  </div>
                  <span className="font-semibold text-secondary-900 dark:text-secondary-100">
                    {budgetStatus.warningCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-danger-600 dark:text-danger-400" />
                    </div>
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                      Exceeded
                    </span>
                  </div>
                  <span className="font-semibold text-secondary-900 dark:text-secondary-100">
                    {budgetStatus.exceededCount}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Budget List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
            Budget Categories
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} variant="elevated" padding="lg">
                  <Loading size="lg" />
                </Card>
              ))}
            </div>
          ) : budgets.length === 0 ? (
            <Card variant="elevated" padding="none">
              <EmptyState
                icon={DollarSign}
                title="No budgets set"
                description="Create your first budget to start tracking your spending"
                action={{
                  label: "Create Budget",
                  onClick: () => setIsCreateModalOpen(true),
                  icon: <Plus className="w-4 h-4" />,
                }}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onUpdate={() => {
                    fetchBudgets();
                    fetchBudgetStatus();
                  }}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* Budget Recommendations */}
        <BudgetRecommendations month={selectedMonth} />
      </div>

      {/* Create Budget Modal */}
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchBudgets();
          fetchBudgetStatus();
        }}
        defaultMonth={selectedMonth}
      />

      {/* Edit Budget Modal */}
      <EditBudgetModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBudget(null);
        }}
        onSuccess={handleEditSuccess}
        budget={selectedBudget}
      />

      {/* Export Budget Modal */}
      <ExportBudgetModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        budgets={budgets}
        month={selectedMonth.toString()}
      />
    </div>
  );
}
