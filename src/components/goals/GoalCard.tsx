"use client";

import { useState } from "react";
import {
  Target,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Plus,
  Clock,
} from "lucide-react";
import { GoalType } from "@/types/goal";

interface GoalCardProps {
  goal: GoalType;
  onEdit: (goal: GoalType) => void;
  onContribute: (goal: GoalType) => void;
  onRefresh: () => void;
}

export default function GoalCard({
  goal,
  onEdit,
  onContribute,
  onRefresh,
}: GoalCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const handleDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus goal "${goal.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Gagal menghapus goal");
      }
    } catch (error) {
      console.error("Failed to delete goal:", error);
      alert("Terjadi kesalahan saat menghapus goal");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    switch (goal.status) {
      case "ACTIVE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
            Aktif
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
            Tercapai
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
            Dibatalkan
          </span>
        );
    }
  };

  const getProgressColor = () => {
    if (goal.progress >= 100) return "bg-green-600 dark:bg-green-500";
    if (goal.progress >= 75) return "bg-blue-600 dark:bg-blue-500";
    if (goal.progress >= 50) return "bg-yellow-600 dark:bg-yellow-500";
    return "bg-orange-600 dark:bg-orange-500";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {goal.name}
            </h3>
            {goal.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {goal.progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-500`}
              style={{ width: `${Math.min(goal.progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Amount Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Terkumpul
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(goal.currentAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Target
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(goal.targetAmount)}
            </span>
          </div>
        </div>

        {/* Deadline & Contributions */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {goal.deadline && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(goal.deadline)}</span>
            </div>
          )}
          {goal.daysLeft !== null &&
            goal.daysLeft !== undefined &&
            goal.status === "ACTIVE" && (
              <div
                className={`flex items-center gap-1.5 text-sm ${
                  goal.daysLeft < 7
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{goal.daysLeft} hari lagi</span>
              </div>
            )}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mt-2">
          <TrendingUp className="w-4 h-4" />
          <span>{goal._count?.contributions || 0} kontribusi</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
        {goal.status === "ACTIVE" && (
          <button
            onClick={() => onContribute(goal)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Kontribusi</span>
          </button>
        )}
        <button
          onClick={() => onEdit(goal)}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting || (goal._count?.contributions || 0) > 0}
          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            (goal._count?.contributions || 0) > 0
              ? "Tidak bisa menghapus goal yang memiliki kontribusi"
              : "Hapus"
          }
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
