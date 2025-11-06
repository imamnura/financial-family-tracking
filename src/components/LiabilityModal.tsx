'use client';

import { useEffect, useState } from 'react';

interface LiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editLiability?: {
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
  } | null;
}

const liabilityTypes = [
  { value: 'MORTGAGE', label: 'Kredit Rumah (KPR)' },
  { value: 'CAR_LOAN', label: 'Kredit Kendaraan' },
  { value: 'CREDIT_CARD', label: 'Kartu Kredit' },
  { value: 'PERSONAL_LOAN', label: 'Pinjaman Pribadi' },
  { value: 'OTHER', label: 'Lainnya' },
];

export default function LiabilityModal({
  isOpen,
  onClose,
  onSuccess,
  editLiability,
}: LiabilityModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'MORTGAGE' | 'CAR_LOAN' | 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'OTHER'>('PERSONAL_LOAN');
  const [amount, setAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [creditor, setCreditor] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editLiability) {
      setName(editLiability.name);
      setType(editLiability.type);
      setAmount(editLiability.amount.toString());
      setRemainingAmount(editLiability.remainingAmount.toString());
      setInterestRate(editLiability.interestRate?.toString() || '');
      setCreditor(editLiability.creditor || '');
      setDescription(editLiability.description || '');
      
      if (editLiability.startDate) {
        const date = new Date(editLiability.startDate);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setStartDate(localDate.toISOString().slice(0, 16));
      } else {
        setStartDate('');
      }
      
      if (editLiability.dueDate) {
        const date = new Date(editLiability.dueDate);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setDueDate(localDate.toISOString().slice(0, 16));
      } else {
        setDueDate('');
      }
    } else {
      // Reset form for new liability
      setName('');
      setType('PERSONAL_LOAN');
      setAmount('');
      setRemainingAmount('');
      setInterestRate('');
      setCreditor('');
      setDescription('');
      setStartDate('');
      setDueDate('');
    }
    setError('');
  }, [editLiability, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const numericAmount = parseFloat(amount);
      const numericRemainingAmount = parseFloat(remainingAmount);
      const numericInterestRate = interestRate ? parseFloat(interestRate) : null;

      if (isNaN(numericAmount) || numericAmount < 0) {
        setError('Jumlah hutang tidak valid');
        setLoading(false);
        return;
      }

      if (isNaN(numericRemainingAmount) || numericRemainingAmount < 0) {
        setError('Sisa hutang tidak valid');
        setLoading(false);
        return;
      }

      if (numericRemainingAmount > numericAmount) {
        setError('Sisa hutang tidak boleh lebih besar dari jumlah hutang');
        setLoading(false);
        return;
      }

      if (numericInterestRate !== null && (isNaN(numericInterestRate) || numericInterestRate < 0 || numericInterestRate > 100)) {
        setError('Suku bunga tidak valid (0-100%)');
        setLoading(false);
        return;
      }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
        amount: numericAmount,
        remainingAmount: numericRemainingAmount,
        interestRate: numericInterestRate,
        creditor: creditor.trim() || null,
        description: description.trim() || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      let response;
      if (editLiability) {
        // Update existing liability
        response = await fetch(`/api/liabilities/${editLiability.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new liability
        response = await fetch('/api/liabilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Terjadi kesalahan');
        setLoading(false);
        return;
      }

      // Reset form and close modal
      setName('');
      setType('PERSONAL_LOAN');
      setAmount('');
      setRemainingAmount('');
      setInterestRate('');
      setCreditor('');
      setDescription('');
      setStartDate('');
      setDueDate('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Submit liability error:', err);
      setError('Terjadi kesalahan saat menyimpan hutang');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editLiability ? 'Edit Hutang' : 'Tambah Hutang Baru'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Liability Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Nama Hutang <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Contoh: KPR Bank BCA, Pinjaman Modal Usaha"
              required
              maxLength={200}
            />
          </div>

          {/* Liability Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tipe Hutang <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              {liabilityTypes.map((liabilityType) => (
                <option key={liabilityType.value} value={liabilityType.value}>
                  {liabilityType.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Remaining Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Jumlah Total (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label
                htmlFor="remainingAmount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Sisa Hutang (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="remainingAmount"
                value={remainingAmount}
                onChange={(e) => setRemainingAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Interest Rate and Creditor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="interestRate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Suku Bunga (%)
              </label>
              <input
                type="number"
                id="interestRate"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div>
              <label
                htmlFor="creditor"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Kreditor
              </label>
              <input
                type="text"
                id="creditor"
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Bank / Lembaga"
                maxLength={200}
              />
            </div>
          </div>

          {/* Start Date and Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tanggal Mulai
              </label>
              <input
                type="datetime-local"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="dueDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Jatuh Tempo
              </label>
              <input
                type="datetime-local"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Deskripsi
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Tambahkan catatan tentang hutang..."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : editLiability ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
