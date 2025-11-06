'use client';

import { useEffect, useState } from 'react';
import LiabilityModal from '@/components/LiabilityModal';

interface Liability {
  id: string;
  name: string;
  type: 'MORTGAGE' | 'CAR_LOAN' | 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'OTHER';
  amount: number;
  remainingAmount: number;
  interestRate?: number | null;
  description?: string | null;
  creditor?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LiabilitySummary {
  total: number;
  totalAmount: number;
  totalRemaining: number;
  totalPaid: number;
}

const liabilityTypeLabels: Record<string, string> = {
  MORTGAGE: 'KPR',
  CAR_LOAN: 'Kredit Kendaraan',
  CREDIT_CARD: 'Kartu Kredit',
  PERSONAL_LOAN: 'Pinjaman Pribadi',
  OTHER: 'Lainnya',
};

const liabilityTypeIcons: Record<string, string> = {
  MORTGAGE: '🏠',
  CAR_LOAN: '🚗',
  CREDIT_CARD: '💳',
  PERSONAL_LOAN: '💰',
  OTHER: '📋',
};

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [summary, setSummary] = useState<LiabilitySummary>({
    total: 0,
    totalAmount: 0,
    totalRemaining: 0,
    totalPaid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [deletingLiabilityId, setDeletingLiabilityId] = useState<string | null>(null);

  const fetchLiabilities = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/liabilities');
      
      if (!response.ok) {
        throw new Error('Gagal memuat data hutang');
      }

      const data = await response.json();
      setLiabilities(data.liabilities || []);
      setSummary(data.summary || {
        total: 0,
        totalAmount: 0,
        totalRemaining: 0,
        totalPaid: 0,
      });
    } catch (err) {
      console.error('Fetch liabilities error:', err);
      setError('Gagal memuat data hutang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiabilities();
  }, []);

  const handleAddLiability = () => {
    setEditingLiability(null);
    setIsModalOpen(true);
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingLiability(liability);
    setIsModalOpen(true);
  };

  const handleDeleteLiability = async (liabilityId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus hutang ini?')) {
      return;
    }

    try {
      setDeletingLiabilityId(liabilityId);
      const response = await fetch(`/api/liabilities/${liabilityId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus hutang');
      }

      // Refresh liabilities
      await fetchLiabilities();
    } catch (err) {
      console.error('Delete liability error:', err);
      alert(err instanceof Error ? err.message : 'Gagal menghapus hutang');
    } finally {
      setDeletingLiabilityId(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingLiability(null);
  };

  const handleModalSuccess = () => {
    fetchLiabilities();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const calculateProgress = (amount: number, remaining: number) => {
    if (amount === 0) return 0;
    const paid = amount - remaining;
    return Math.round((paid / amount) * 100);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Hutang
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola dan pantau hutang keluarga Anda
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Hutang
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Jumlah Total
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(summary.totalAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Sisa Hutang
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(summary.totalRemaining)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Sudah Dibayar
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(summary.totalPaid)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mb-4">
        <button
          onClick={handleAddLiability}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Tambah Hutang
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Memuat data...</p>
        </div>
      )}

      {/* Liabilities Table */}
      {!loading && liabilities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nama Hutang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Jumlah Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sisa Hutang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Jatuh Tempo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {liabilities.map((liability) => {
                  const progress = calculateProgress(liability.amount, liability.remainingAmount);
                  return (
                    <tr key={liability.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{liabilityTypeIcons[liability.type]}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {liability.name}
                            </div>
                            {liability.creditor && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {liability.creditor}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {liabilityTypeLabels[liability.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(liability.amount)}
                        </div>
                        {liability.interestRate && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {liability.interestRate}% p.a.
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(liability.remainingAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-green-500 h-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(liability.dueDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditLiability(liability)}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteLiability(liability.id)}
                            disabled={deletingLiabilityId === liability.id}
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Hapus"
                          >
                            {deletingLiabilityId === liability.id ? (
                              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && liabilities.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Belum Ada Hutang
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Mulai tambahkan hutang keluarga untuk melacak kewajiban finansial
          </p>
          <button
            onClick={handleAddLiability}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tambah Hutang Pertama
          </button>
        </div>
      )}

      {/* Liability Modal */}
      <LiabilityModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editLiability={editingLiability}
      />
    </div>
  );
}
