"use client";

import React, { useState } from "react";
import { MoreVertical, Edit2, Trash2, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  pendingOperations?: Set<string>;
}

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  pendingOperations = new Set(),
}: TransactionListProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    onDelete(id);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Wallet
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-700">
          {transactions.map((transaction) => {
            const isPending = pendingOperations.has(transaction.id);

            return (
              <tr
                key={transaction.id}
                className={`hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors ${
                  isPending ? "opacity-50" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600 dark:text-secondary-400">
                  {formatDate(new Date(transaction.date))}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        {transaction.description}
                      </div>
                      {transaction.notes && (
                        <div className="text-sm text-secondary-500 dark:text-secondary-400 truncate max-w-xs">
                          {transaction.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {transaction.category.icon && (
                      <span className="text-lg">
                        {transaction.category.icon}
                      </span>
                    )}
                    <span className="text-sm text-secondary-900 dark:text-secondary-100">
                      {transaction.category.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600 dark:text-secondary-400">
                  {transaction.wallet.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={
                      transaction.type === "INCOME" ? "income" : "expense"
                    }
                    size="sm"
                  >
                    {transaction.type}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span
                    className={`text-sm font-semibold ${
                      transaction.type === "INCOME"
                        ? "text-success-600 dark:text-success-400"
                        : "text-danger-600 dark:text-danger-400"
                    }`}
                  >
                    {transaction.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setActiveMenu(
                          activeMenu === transaction.id ? null : transaction.id
                        )
                      }
                      className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {activeMenu === transaction.id && (
                      <>
                        {/* Overlay to close menu */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                        />

                        {/* Dropdown menu */}
                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-dropdown bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 z-20">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                onEdit(transaction);
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(transaction.id);
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
