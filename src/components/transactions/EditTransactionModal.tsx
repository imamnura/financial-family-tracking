"use client";

import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Button, Alert } from "@/components/ui";
import { DollarSign, Calendar, FileText } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
}

interface WalletType {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  categoryId: string;
  walletId: string;
  date: string;
  notes?: string | null;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: Transaction | null;
}

export default function EditTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: EditTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    amount: "",
    description: "",
    categoryId: "",
    walletId: "",
    date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchWallets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (transaction && isOpen) {
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        categoryId: transaction.categoryId,
        walletId: transaction.walletId,
        date: new Date(transaction.date).toISOString().slice(0, 16),
        notes: transaction.notes || "",
      });
    }
  }, [transaction, isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data.categories || data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets");
      if (!response.ok) throw new Error("Failed to fetch wallets");
      const data = await response.json();
      setWallets(data.wallets || data || []);
    } catch (error) {
      console.error("Error fetching wallets:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!transaction) return;

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!formData.description.trim()) {
      setError("Please enter a description");
      return;
    }
    if (!formData.categoryId) {
      setError("Please select a category");
      return;
    }
    if (!formData.walletId) {
      setError("Please select a wallet");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          categoryId: formData.categoryId,
          walletId: formData.walletId,
          date: new Date(formData.date).toISOString(),
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update transaction");
      }

      onSuccess();
    } catch (error) {
      console.error("Error updating transaction:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update transaction"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    (cat) => cat.type === formData.type
  );

  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Transaction"
      description="Update transaction details"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert
            variant="danger"
            message={error}
            dismissible
            onClose={() => setError("")}
          />
        )}

        {/* Transaction Type */}
        <div>
          <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2 block">
            Transaction Type <span className="text-danger-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, type: "INCOME", categoryId: "" })
              }
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.type === "INCOME"
                  ? "border-success-500 bg-success-50 dark:bg-success-900/20"
                  : "border-secondary-200 dark:border-secondary-700 hover:border-success-300"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">💰</div>
                <div className="font-semibold text-secondary-900 dark:text-secondary-100">
                  Income
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, type: "EXPENSE", categoryId: "" })
              }
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.type === "EXPENSE"
                  ? "border-danger-500 bg-danger-50 dark:bg-danger-900/20"
                  : "border-secondary-200 dark:border-secondary-700 hover:border-danger-300"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">💸</div>
                <div className="font-semibold text-secondary-900 dark:text-secondary-100">
                  Expense
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            leftIcon={<DollarSign className="w-5 h-5" />}
            required
            fullWidth
          />

          {/* Date */}
          <Input
            label="Date & Time"
            type="datetime-local"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            leftIcon={<Calendar className="w-5 h-5" />}
            required
            fullWidth
          />
        </div>

        {/* Description */}
        <Input
          label="Description"
          type="text"
          placeholder="e.g., Grocery shopping"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          leftIcon={<FileText className="w-5 h-5" />}
          required
          fullWidth
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <Select
            label="Category"
            value={formData.categoryId}
            onChange={(e) =>
              setFormData({ ...formData, categoryId: e.target.value })
            }
            options={filteredCategories.map((cat) => ({
              value: cat.id,
              label: `${cat.icon || ""} ${cat.name}`.trim(),
            }))}
            placeholder="Select a category"
            required
            fullWidth
          />

          {/* Wallet */}
          <Select
            label="Wallet"
            value={formData.walletId}
            onChange={(e) =>
              setFormData({ ...formData, walletId: e.target.value })
            }
            options={wallets.map((wallet) => ({
              value: wallet.id,
              label: `${wallet.name} (${wallet.type})`,
            }))}
            placeholder="Select a wallet"
            required
            fullWidth
          />
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5 block"
          >
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Add additional notes..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-700 px-4 py-2.5 text-sm bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          />
        </div>
      </form>
    </Modal>
  );
}
