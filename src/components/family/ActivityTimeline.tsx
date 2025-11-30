"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  dataBefore: any;
  dataAfter: any;
  details: any;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: User;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_LABELS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  CREATE_TRANSACTION: { label: "Transaksi Dibuat", icon: "💰", color: "green" },
  UPDATE_TRANSACTION: { label: "Transaksi Diubah", icon: "✏️", color: "blue" },
  DELETE_TRANSACTION: { label: "Transaksi Dihapus", icon: "🗑️", color: "red" },
  CREATE_BUDGET: { label: "Budget Dibuat", icon: "📊", color: "purple" },
  UPDATE_BUDGET: { label: "Budget Diubah", icon: "📈", color: "blue" },
  DELETE_BUDGET: { label: "Budget Dihapus", icon: "📉", color: "red" },
  CREATE_GOAL: { label: "Target Dibuat", icon: "🎯", color: "green" },
  UPDATE_GOAL: { label: "Target Diubah", icon: "🔄", color: "blue" },
  DELETE_GOAL: { label: "Target Dihapus", icon: "❌", color: "red" },
  GOAL_CONTRIBUTION: { label: "Kontribusi Target", icon: "➕", color: "green" },
  CREATE_ASSET: { label: "Aset Ditambahkan", icon: "🏠", color: "green" },
  UPDATE_ASSET: { label: "Aset Diubah", icon: "🔧", color: "blue" },
  DELETE_ASSET: { label: "Aset Dihapus", icon: "🔻", color: "red" },
  CREATE_LIABILITY: {
    label: "Hutang Ditambahkan",
    icon: "💳",
    color: "orange",
  },
  UPDATE_LIABILITY: { label: "Hutang Diubah", icon: "💱", color: "blue" },
  DELETE_LIABILITY: { label: "Hutang Dihapus", icon: "✅", color: "green" },
  WALLET_TRANSFER: { label: "Transfer Dompet", icon: "💸", color: "blue" },
  UPDATE_FAMILY_SETTINGS: {
    label: "Pengaturan Diubah",
    icon: "⚙️",
    color: "gray",
  },
  MEMBER_INVITED: { label: "Anggota Diundang", icon: "📧", color: "blue" },
  MEMBER_JOINED: { label: "Anggota Bergabung", icon: "👥", color: "green" },
};

export function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");

  useEffect(() => {
    fetchActivities();
  }, [pagination.page, actionFilter, entityTypeFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (actionFilter) params.append("action", actionFilter);
      if (entityTypeFilter) params.append("entityType", entityTypeFilter);

      const response = await fetch(`/api/family/activity?${params}`);

      if (!response.ok) {
        throw new Error("Gagal memuat riwayat aktivitas");
      }

      const data = await response.json();
      setActivities(data.activities);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error("Fetch activities error:", err);
      setError(err.message || "Gagal memuat riwayat aktivitas");
    } finally {
      setLoading(false);
    }
  };

  const getActivityInfo = (action: string) => {
    return (
      ACTION_LABELS[action] || { label: action, icon: "📝", color: "gray" }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      purple:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      orange:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
      gray: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400",
    };
    return colors[color] || colors.gray;
  };

  const renderChanges = (changes: any) => {
    if (!changes || typeof changes !== "object") return null;

    return (
      <div className="mt-2 text-xs space-y-1">
        {Object.entries(changes).map(([key, value]: [string, any]) => {
          if (
            value &&
            typeof value === "object" &&
            "old" in value &&
            "new" in value
          ) {
            return (
              <div key={key} className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">{key}:</span>{" "}
                <span className="line-through text-red-600 dark:text-red-400">
                  {JSON.stringify(value.old)}
                </span>{" "}
                →{" "}
                <span className="text-green-600 dark:text-green-400">
                  {JSON.stringify(value.new)}
                </span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Aksi
          </label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Semua Aksi</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipe Entity
          </label>
          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Semua Tipe</option>
            <option value="Transaction">Transaksi</option>
            <option value="Budget">Budget</option>
            <option value="Goal">Target</option>
            <option value="Asset">Aset</option>
            <option value="Liability">Hutang</option>
            <option value="Wallet">Dompet</option>
            <option value="Family">Keluarga</option>
          </select>
        </div>

        {(actionFilter || entityTypeFilter) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setActionFilter("");
                setEntityTypeFilter("");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Memuat aktivitas...
          </p>
        </div>
      )}

      {/* Timeline */}
      {!loading && activities.length > 0 && (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const info = getActivityInfo(activity.action);
            return (
              <div
                key={activity.id}
                className="relative pl-8 pb-6 border-l-2 border-gray-200 dark:border-gray-700 last:border-l-0 last:pb-0"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 -ml-[9px] mt-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getColorClasses(
                    info.color
                  )}`}
                />

                {/* Activity card */}
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {info.label}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          oleh{" "}
                          <span className="font-medium">
                            {activity.user.name}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>

                  {/* Changes */}
                  {activity.changes && renderChanges(activity.changes)}

                  {/* Entity info */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 rounded">
                      {activity.entityType}
                    </span>
                    <span className="font-mono text-[10px]">
                      {activity.entityId.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && activities.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Belum Ada Aktivitas
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Riwayat aktivitas keluarga akan muncul di sini
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Menampilkan {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            dari {pagination.total} aktivitas
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Sebelumnya
            </button>
            <div className="flex items-center gap-1">
              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: pageNum }))
                      }
                      className={`w-8 h-8 text-sm rounded ${
                        pagination.page === pageNum
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}
            </div>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
