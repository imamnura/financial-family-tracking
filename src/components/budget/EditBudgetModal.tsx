"use client";

import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Button, Alert } from "@/components/ui";
import { DollarSign, Calendar } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
}

interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number;
}

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budget: Budget | null;
}

export default function EditBudgetModal({
  isOpen,
  onClose,
  onSuccess,
  budget,
}: EditBudgetModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    month: parseInt(
      `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(
        2,
        "0"
      )}`
    ),
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (budget && isOpen) {
      setFormData({
        categoryId: budget.categoryId,
        amount: budget.amount.toString(),
        month: budget.month,
      });
    }
  }, [budget, isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      const expenseCategories = (data.categories || data || []).filter(
        (cat: Category) => cat.type === "EXPENSE"
      );
      setCategories(expenseCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!budget) return;

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid budget amount");
      return;
    }
    if (!formData.categoryId) {
      setError("Please select a category");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/budget/${budget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: formData.categoryId,
          amount: parseFloat(formData.amount),
          month: formData.month,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update budget");
      }

      onSuccess();
    } catch (error) {
      console.error("Error updating budget:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update budget"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatMonthYear = (monthInt: number) => {
    const year = Math.floor(monthInt / 100);
    const month = monthInt % 100;
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const year = Math.floor(formData.month / 100);
    const month = formData.month % 100;

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

    setFormData({ ...formData, month: newYear * 100 + newMonth });
  };

  if (!budget) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Budget"
      description="Update budget details"
      size="md"
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

        {/* Month Selector */}
        <div>
          <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2 block">
            Budget Month <span className="text-danger-500">*</span>
          </label>
          <div className="flex items-center gap-3 p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange("prev")}
            >
              ←
            </Button>
            <div className="flex-1 flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-secondary-900 dark:text-secondary-100">
                {formatMonthYear(formData.month)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange("next")}
            >
              →
            </Button>
          </div>
        </div>

        {/* Category */}
        <Select
          label="Category"
          value={formData.categoryId}
          onChange={(e) =>
            setFormData({ ...formData, categoryId: e.target.value })
          }
          options={categories.map((cat) => ({
            value: cat.id,
            label: `${cat.icon || ""} ${cat.name}`.trim(),
          }))}
          placeholder="Select a category"
          hint="Only expense categories are shown"
          required
          fullWidth
        />

        {/* Amount */}
        <Input
          label="Budget Amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          leftIcon={<DollarSign className="w-5 h-5" />}
          hint="Set a monthly spending limit for this category"
          required
          fullWidth
        />
      </form>
    </Modal>
  );
}
