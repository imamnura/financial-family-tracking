"use client";

import { Plus, ArrowRightLeft, Target, TrendingUp } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface QuickActionsProps {
  onAddTransaction: () => void;
  onTransfer: () => void;
  onCreateBudget: () => void;
  onViewGoals: () => void;
}

export default function QuickActions({
  onAddTransaction,
  onTransfer,
  onCreateBudget,
  onViewGoals,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: "add-transaction",
      label: "Tambah Transaksi",
      icon: Plus,
      color: "text-blue-600 dark:text-blue-400",
      bgColor:
        "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
      onClick: onAddTransaction,
    },
    {
      id: "transfer",
      label: "Transfer Dana",
      icon: ArrowRightLeft,
      color: "text-purple-600 dark:text-purple-400",
      bgColor:
        "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30",
      onClick: onTransfer,
    },
    {
      id: "budget",
      label: "Buat Budget",
      icon: Target,
      color: "text-green-600 dark:text-green-400",
      bgColor:
        "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
      onClick: onCreateBudget,
    },
    {
      id: "goals",
      label: "Lihat Goals",
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      bgColor:
        "bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30",
      onClick: onViewGoals,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Aksi Cepat
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`${action.bgColor} rounded-lg p-4 flex flex-col items-center gap-2 transition-colors duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600`}
            >
              <IconComponent className={`w-6 h-6 ${action.color}`} />
              <span className={`text-sm font-medium ${action.color}`}>
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
