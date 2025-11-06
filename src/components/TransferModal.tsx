'use client';

import { useState, useEffect } from 'react';

interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TransferModal({
  isOpen,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch wallets on mount
  useEffect(() => {
    if (isOpen) {
      fetchWallets();
    }
  }, [isOpen]);

  const fetchWallets = async () => {
    setLoadingWallets(true);
    setError('');
    try {
      const response = await fetch('/api/wallets');
      if (!response.ok) {
        throw new Error('Gagal mengambil data dompet');
      }
      const data = await response.json();
      setWallets(data.wallets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!fromWalletId) {
      setError('Pilih dompet sumber');
      return;
    }

    if (!toWalletId) {
      setError('Pilih dompet tujuan');
      return;
    }

    if (fromWalletId === toWalletId) {
      setError('Tidak dapat transfer ke dompet yang sama');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Jumlah transfer harus lebih dari 0');
      return;
    }

    // Check sufficient balance
    const fromWallet = wallets.find((w) => w.id === fromWalletId);
    if (fromWallet && fromWallet.balance < amountNum) {
      setError(
        `Saldo tidak mencukupi. Saldo tersedia: ${formatCurrency(
          fromWallet.balance
        )}`
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/wallets/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromWalletId,
          toWalletId,
          amount: amountNum,
          description: description || undefined,
          date: new Date(date).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal melakukan transfer');
      }

      setSuccess('Transfer berhasil!');
      
      // Reset form
      setFromWalletId('');
      setToWalletId('');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getWalletBalance = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId);
    return wallet ? wallet.balance : 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Transfer Antar Dompet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* From Wallet */}
          <div>
            <label
              htmlFor="fromWallet"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Dari Dompet <span className="text-red-500">*</span>
            </label>
            <select
              id="fromWallet"
              value={fromWalletId}
              onChange={(e) => setFromWalletId(e.target.value)}
              disabled={loading || loadingWallets}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              required
            >
              <option value="">
                {loadingWallets ? 'Memuat dompet...' : 'Pilih dompet sumber'}
              </option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} - {formatCurrency(wallet.balance)}
                </option>
              ))}
            </select>
            {fromWalletId && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Saldo: {formatCurrency(getWalletBalance(fromWalletId))}
              </p>
            )}
          </div>

          {/* To Wallet */}
          <div>
            <label
              htmlFor="toWallet"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Ke Dompet <span className="text-red-500">*</span>
            </label>
            <select
              id="toWallet"
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              disabled={loading || loadingWallets}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              required
            >
              <option value="">
                {loadingWallets ? 'Memuat dompet...' : 'Pilih dompet tujuan'}
              </option>
              {wallets
                .filter((wallet) => wallet.id !== fromWalletId)
                .map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} - {formatCurrency(wallet.balance)}
                  </option>
                ))}
            </select>
            {toWalletId && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Saldo: {formatCurrency(getWalletBalance(toWalletId))}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Jumlah Transfer <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              placeholder="Masukkan jumlah"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              required
            />
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatCurrency(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Deskripsi (Opsional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="Catatan transfer (opsional)"
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            />
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tanggal Transfer <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              required
            />
          </div>

          {/* Transfer Summary */}
          {fromWalletId && toWalletId && amount && !isNaN(parseFloat(amount)) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                Ringkasan Transfer
              </h3>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <p>
                  <span className="font-medium">Dari:</span>{' '}
                  {wallets.find((w) => w.id === fromWalletId)?.name}
                </p>
                <p>
                  <span className="font-medium">Ke:</span>{' '}
                  {wallets.find((w) => w.id === toWalletId)?.name}
                </p>
                <p>
                  <span className="font-medium">Jumlah:</span>{' '}
                  {formatCurrency(parseFloat(amount))}
                </p>
                <p className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="font-medium">Saldo setelah transfer:</span>
                </p>
                <p className="pl-2">
                  • {wallets.find((w) => w.id === fromWalletId)?.name}:{' '}
                  {formatCurrency(
                    getWalletBalance(fromWalletId) - parseFloat(amount)
                  )}
                </p>
                <p className="pl-2">
                  • {wallets.find((w) => w.id === toWalletId)?.name}:{' '}
                  {formatCurrency(
                    getWalletBalance(toWalletId) + parseFloat(amount)
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || loadingWallets}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Transfer...
                </>
              ) : (
                <>
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
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                  Transfer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
