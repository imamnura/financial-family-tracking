"use client";

import React, { useState } from "react";
import {
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface BudgetCardProps {
  budget: {
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
  };
  onUpdate: () => void;
  onEdit: (budget: {
    id: string;
    categoryId: string;
    amount: number;
    month: number;
  }) => void;
}

export default function BudgetCard({
  budget,
  onUpdate,
  onEdit,
}: BudgetCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const spent = budget.spent || 0;
  const remaining = budget.amount - spent;
  const percentage =
    budget.percentage ||
    (budget.amount > 0 ? (spent / budget.amount) * 100 : 0);

  const getStatusColor = () => {
    if (percentage >= 100) return "danger";
    if (percentage >= 75) return "warning";
    if (percentage >= 50) return "info";
    return "success";
  };

  const getProgressColor = () => {
    if (percentage >= 100) return "bg-danger-500";
    if (percentage >= 75) return "bg-warning-500";
    return "bg-success-500";
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/budget/${budget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete budget");

      onUpdate();
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Failed to delete budget");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg" className="relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {budget.category.icon && (
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-2xl">
              {budget.category.icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
              {budget.category.name}
            </h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Budget: {formatCurrency(budget.amount)}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-dropdown bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEdit({
                        id: budget.id,
                        categoryId: budget.categoryId,
                        amount: budget.amount,
                        month: budget.month,
                      });
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Budget
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Budget
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-secondary-600 dark:text-secondary-400">
            Progress
          </span>
          <Badge variant={getStatusColor()} size="sm">
            {percentage.toFixed(1)}%
          </Badge>
        </div>
        <div className="relative w-full h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
            Spent
          </p>
          <p className="text-lg font-semibold text-danger-600 dark:text-danger-400">
            {formatCurrency(spent)}
          </p>
        </div>
        <div>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
            Remaining
          </p>
          <p
            className={`text-lg font-semibold ${
              remaining >= 0
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }`}
          >
            {formatCurrency(Math.abs(remaining))}
          </p>
        </div>
      </div>

      {/* Warning/Alert */}
      {percentage >= 90 && (
        <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <div className="flex items-center gap-2 text-danger-700 dark:text-danger-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-medium">
              {percentage >= 100
                ? "Budget exceeded!"
                : "Approaching budget limit!"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
