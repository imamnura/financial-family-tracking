'use client';

import { useEffect, useState } from 'react';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAsset?: {
    id: string;
    name: string;
    type: 'PROPERTY' | 'VEHICLE' | 'SAVINGS' | 'INVESTMENT' | 'OTHER';
    value: number;
    description?: string | null;
    acquisitionDate?: Date | null;
  } | null;
}

const assetTypes = [
  { value: 'PROPERTY', label: 'Properti' },
  { value: 'VEHICLE', label: 'Kendaraan' },
  { value: 'SAVINGS', label: 'Tabungan' },
  { value: 'INVESTMENT', label: 'Investasi' },
  { value: 'OTHER', label: 'Lainnya' },
];

export default function AssetModal({
  isOpen,
  onClose,
  onSuccess,
  editAsset,
}: AssetModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'PROPERTY' | 'VEHICLE' | 'SAVINGS' | 'INVESTMENT' | 'OTHER'>('SAVINGS');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editAsset) {
      setName(editAsset.name);
      setType(editAsset.type);
      setValue(editAsset.value.toString());
      setDescription(editAsset.description || '');
      if (editAsset.acquisitionDate) {
        const date = new Date(editAsset.acquisitionDate);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setAcquisitionDate(localDate.toISOString().slice(0, 16));
      } else {
        setAcquisitionDate('');
      }
    } else {
      // Reset form for new asset
      setName('');
      setType('SAVINGS');
      setValue('');
      setDescription('');
      setAcquisitionDate('');
    }
    setError('');
  }, [editAsset, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue < 0) {
        setError('Nilai aset tidak valid');
        setLoading(false);
        return;
      }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
        value: numericValue,
        description: description.trim() || null,
        acquisitionDate: acquisitionDate
          ? new Date(acquisitionDate).toISOString()
          : null,
      };

      let response;
      if (editAsset) {
        // Update existing asset
        response = await fetch(`/api/assets/${editAsset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new asset
        response = await fetch('/api/assets', {
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
      setType('SAVINGS');
      setValue('');
      setDescription('');
      setAcquisitionDate('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Submit asset error:', err);
      setError('Terjadi kesalahan saat menyimpan aset');
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
            {editAsset ? 'Edit Aset' : 'Tambah Aset Baru'}
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
          {/* Asset Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Nama Aset <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Contoh: Rumah Jakarta, Mobil Avanza"
              required
              maxLength={200}
            />
          </div>

          {/* Asset Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tipe Aset <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              {assetTypes.map((assetType) => (
                <option key={assetType.value} value={assetType.value}>
                  {assetType.label}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Value */}
          <div>
            <label
              htmlFor="value"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Nilai Aset (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* Acquisition Date */}
          <div>
            <label
              htmlFor="acquisitionDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tanggal Perolehan
            </label>
            <input
              type="datetime-local"
              id="acquisitionDate"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
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
              placeholder="Tambahkan catatan tentang aset..."
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
              {loading ? 'Menyimpan...' : editAsset ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
