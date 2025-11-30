"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface RecurringTransaction {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  notes: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  endDate: string | null;
  nextDate: string | null;
  lastRunDate: string | null;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  dayOfMonth: number | null;
  dayOfWeek: number | null;
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

const frequencyLabels = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

const statusColors = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PAUSED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const statusLabels = {
  ACTIVE: "Aktif",
  PAUSED: "Dijeda",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default function RecurringList() {
  const [recurrings, setRecurrings] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");

  useEffect(() => {
    fetchRecurrings();
  }, [filter, statusFilter]);

  const fetchRecurrings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("type", filter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const response = await fetch(`/api/recurring-transactions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setRecurrings(data.recurrings || []);
    } catch (error) {
      console.error("Failed to fetch recurring transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update");
      fetchRecurrings();
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const executeNow = async (id: string) => {
    if (!confirm("Eksekusi transaksi recurring sekarang?")) return;
    try {
      const response = await fetch(
        `/api/recurring-transactions/${id}/execute`,
        {
          method: "POST",
        }
      );
      if (!response.ok) throw new Error("Failed to execute");
      alert("Transaksi berhasil dieksekusi!");
      fetchRecurrings();
    } catch (error) {
      console.error("Failed to execute:", error);
      alert("Gagal mengeksekusi transaksi");
    }
  };

  const deleteRecurring = async (id: string) => {
    if (!confirm("Hapus recurring transaction ini?")) return;
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      fetchRecurrings();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
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
        <h2 className="text-2xl font-bold">Transaksi Berulang</h2>
        <button
          onClick={() => (window.location.href = "/recurring/new")}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Buat Recurring
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PAUSED">Dijeda</option>
          <option value="COMPLETED">Selesai</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
      </div>

      {/* List */}
      {recurrings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Belum ada transaksi berulang
        </div>
      ) : (
        <div className="grid gap-4">
          {recurrings.map((recurring) => (
            <div
              key={recurring.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {recurring.type === "INCOME" ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <h3 className="font-semibold text-lg">{recurring.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        statusColors[recurring.status]
                      }`}
                    >
                      {statusLabels[recurring.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500 block">Jumlah</span>
                      <span
                        className={`font-semibold ${
                          recurring.type === "INCOME"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(recurring.amount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Frekuensi</span>
                      <span className="font-medium">
                        {frequencyLabels[recurring.frequency]}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Eksekusi Berikutnya
                      </span>
                      <span className="font-medium">
                        {formatDate(recurring.nextDate)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Terakhir Dijalankan
                      </span>
                      <span className="font-medium">
                        {formatDate(recurring.lastRunDate)}
                      </span>
                    </div>
                  </div>

                  {recurring.category && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Kategori: </span>
                      <span className="font-medium">
                        {recurring.category.name}
                      </span>
                    </div>
                  )}

                  {recurring.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {recurring.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {recurring.status === "ACTIVE" && (
                    <button
                      onClick={() => executeNow(recurring.id)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                      title="Eksekusi Sekarang"
                    >
                      <Play className="w-4 h-4 text-blue-600" />
                    </button>
                  )}

                  {(recurring.status === "ACTIVE" ||
                    recurring.status === "PAUSED") && (
                    <button
                      onClick={() =>
                        toggleStatus(recurring.id, recurring.status)
                      }
                      className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900 rounded"
                      title={
                        recurring.status === "ACTIVE" ? "Jeda" : "Aktifkan"
                      }
                    >
                      {recurring.status === "ACTIVE" ? (
                        <Pause className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <Play className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() =>
                      (window.location.href = `/recurring/${recurring.id}/edit`)
                    }
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteRecurring(recurring.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
