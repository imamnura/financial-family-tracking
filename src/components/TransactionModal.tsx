'use client';

import { useState, useEffect, FormEvent } from 'react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
}

interface Wallet {
  id: string;
  name: string;
  description: string | null;
  balance: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionModal({ isOpen, onClose, onSuccess }: TransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount: '',
    description: '',
    categoryId: '',
    walletId: '',
    date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    notes: '',
  });

  // Fetch categories and wallets when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Filter categories by transaction type
  const filteredCategories = categories.filter(
    (category) => category.type === formData.type
  );

  const fetchDropdownData = async () => {
    try {
      const [categoriesRes, walletsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/wallets'),
      ]);

      if (!categoriesRes.ok || !walletsRes.ok) {
        throw new Error('Gagal mengambil data');
      }

      const categoriesData = await categoriesRes.json();
      const walletsData = await walletsRes.json();

      setCategories(categoriesData);
      setWallets(walletsData);

      // Set default wallet if available
      if (walletsData.length > 0 && !formData.walletId) {
        setFormData((prev) => ({ ...prev, walletId: walletsData[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat transaksi');
      }

      // Reset form
      setFormData({
        type: 'EXPENSE',
        amount: '',
        description: '',
        categoryId: '',
        walletId: wallets[0]?.id || '',
        date: new Date().toISOString().slice(0, 16),
        notes: '',
      });

      // Call success callback
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (type: 'INCOME' | 'EXPENSE') => {
    setFormData({
      ...formData,
      type,
      categoryId: '', // Reset category when type changes
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tambah Transaksi
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
              <p className="text-sm text-danger-800 dark:text-danger-200 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Transaction Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipe Transaksi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('INCOME')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    formData.type === 'INCOME'
                      ? 'bg-income-dark text-white dark:bg-income-light dark:text-gray-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  💚 Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('EXPENSE')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    formData.type === 'EXPENSE'
                      ? 'bg-expense-dark text-white dark:bg-expense-light dark:text-gray-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  🔴 Pengeluaran
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jumlah (Rp)
              </label>
              <input
                id="amount"
                type="number"
                required
                min="1"
                step="any"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input-field w-full"
                placeholder="50000"
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deskripsi
              </label>
              <input
                id="description"
                type="text"
                required
                maxLength={500}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field w-full"
                placeholder="Makan siang di restoran"
                disabled={isLoading}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategori
              </label>
              <select
                id="category"
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="input-field w-full"
                disabled={isLoading}
              >
                <option value="">Pilih Kategori</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Wallet */}
            <div>
              <label htmlFor="wallet" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dompet
              </label>
              <select
                id="wallet"
                required
                value={formData.walletId}
                onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                className="input-field w-full"
                disabled={isLoading}
              >
                <option value="">Pilih Dompet</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} (Saldo: Rp {wallet.balance.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tanggal & Waktu
              </label>
              <input
                id="date"
                type="datetime-local"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field w-full"
                disabled={isLoading}
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Catatan (Opsional)
              </label>
              <textarea
                id="notes"
                maxLength={1000}
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field w-full resize-none"
                placeholder="Tambahkan catatan jika diperlukan..."
                disabled={isLoading}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menyimpan...
                  </span>
                ) : (
                  'Simpan Transaksi'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
