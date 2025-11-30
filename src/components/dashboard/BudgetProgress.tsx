"use client";

interface BudgetStatusItem {
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
}

interface BudgetProgressProps {
  budgets: BudgetStatusItem[];
  isLoading?: boolean;
}

export default function BudgetProgress({
  budgets,
  isLoading = false,
}: BudgetProgressProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "exceeded":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get status text color
  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "on_track":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "exceeded":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="text-center py-8">
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
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Belum ada budget bulan ini
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => (
        <div key={budget.budgetId} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{budget.categoryIcon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {budget.categoryName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(budget.spent)} /{" "}
                  {formatCurrency(budget.budgetAmount)}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-semibold ${getStatusTextColor(
                budget.status
              )}`}
            >
              {budget.percentage.toFixed(0)}%
            </span>
          </div>

          <div className="relative">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStatusColor(
                  budget.status
                )} transition-all duration-300`}
                style={{ width: `${Math.min(budget.percentage, 100)}%` }}
              />
            </div>
          </div>

          {budget.status === "warning" && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ Mendekati limit budget
            </p>
          )}
          {budget.status === "exceeded" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              🚨 Melebihi budget (
              {formatCurrency(budget.spent - budget.budgetAmount)})
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
