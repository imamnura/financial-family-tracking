"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface TransactionTemplate {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  amount: number | null;
  description: string | null;
  notes: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
  fromWallet: {
    id: string;
    name: string;
  } | null;
  toWallet: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export default function TemplateList() {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TransactionTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("type", filter);

      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Hapus template ini?")) return;
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      fetchTemplates();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const openUseModal = (template: TransactionTemplate) => {
    setSelectedTemplate(template);
    setUseModalOpen(true);
  };

  const useTemplate = async (overrides: Record<string, any>) => {
    if (!selectedTemplate) return;
    try {
      const response = await fetch(
        `/api/templates/${selectedTemplate.id}/use`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(overrides),
        }
      );
      if (!response.ok) throw new Error("Failed to use template");
      alert("Transaksi berhasil dibuat dari template!");
      setUseModalOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Failed to use template:", error);
      alert("Gagal membuat transaksi");
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "Tidak ditentukan";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Belum pernah";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Template Transaksi</h2>
        <button
          onClick={() => (window.location.href = "/templates/new")}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Buat Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1 rounded ${
            filter === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilter("INCOME")}
          className={`px-3 py-1 rounded ${
            filter === "INCOME"
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          Pemasukan
        </button>
        <button
          onClick={() => setFilter("EXPENSE")}
          className={`px-3 py-1 rounded ${
            filter === "EXPENSE"
              ? "bg-red-600 text-white"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          Pengeluaran
        </button>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Belum ada template transaksi
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {template.type === "INCOME" ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <h3 className="font-semibold">{template.name}</h3>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div>
                  <span className="text-gray-500">Jumlah: </span>
                  <span
                    className={`font-semibold ${
                      template.type === "INCOME"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(template.amount)}
                  </span>
                </div>

                {template.category && (
                  <div>
                    <span className="text-gray-500">Kategori: </span>
                    <span className="font-medium">
                      {template.category.name}
                    </span>
                  </div>
                )}

                {template.fromWallet && (
                  <div>
                    <span className="text-gray-500">Dari: </span>
                    <span className="font-medium">
                      {template.fromWallet.name}
                    </span>
                  </div>
                )}

                {template.toWallet && (
                  <div>
                    <span className="text-gray-500">Ke: </span>
                    <span className="font-medium">
                      {template.toWallet.name}
                    </span>
                  </div>
                )}

                {template.description && (
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>

              {/* Usage Stats */}
              <div className="text-xs text-gray-500 mb-3 border-t pt-2">
                <div className="flex justify-between">
                  <span>Digunakan: {template.usageCount}x</span>
                  <span>Terakhir: {formatDate(template.lastUsedAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => openUseModal(template)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                >
                  <Zap className="w-4 h-4" />
                  Gunakan
                </button>

                <button
                  onClick={() =>
                    (window.location.href = `/templates/${template.id}/edit`)
                  }
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Use Template Modal */}
      {useModalOpen && selectedTemplate && (
        <UseTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setUseModalOpen(false);
            setSelectedTemplate(null);
          }}
          onSubmit={useTemplate}
        />
      )}
    </div>
  );
}

function UseTemplateModal({
  template,
  onClose,
  onSubmit,
}: {
  template: TransactionTemplate;
  onClose: () => void;
  onSubmit: (overrides: Record<string, any>) => void;
}) {
  const [amount, setAmount] = useState(template.amount?.toString() || "");
  const [description, setDescription] = useState(template.description || "");
  const [notes, setNotes] = useState(template.notes || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const overrides: Record<string, any> = {
      date: new Date(date).toISOString(),
    };
    if (amount !== template.amount?.toString()) {
      overrides.amount = parseFloat(amount);
    }
    if (description !== template.description) {
      overrides.description = description;
    }
    if (notes !== template.notes) {
      overrides.notes = notes;
    }
    onSubmit(overrides);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          Gunakan Template: {template.name}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Jumlah</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Buat Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
