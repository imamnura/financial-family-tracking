"use client";

import { useState } from "react";
import {
  X,
  Edit,
  Trash2,
  Calendar,
  Wallet,
  Tag,
  User,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import TransactionModal from "./TransactionModal";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description: string;
  date: string;
  notes?: string | null;
  receiptUrl?: string | null;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  category: {
    id: string;
    name: string;
    icon?: string | null;
    type: "INCOME" | "EXPENSE";
  };
  fromWallet: {
    id: string;
    name: string;
  } | null;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onSuccess: () => void;
}

export default function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: TransactionDetailModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(date);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    onSuccess();
  };

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || "Gagal menghapus transaksi");
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      alert("Terjadi kesalahan saat menghapus transaksi");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Edit Modal */}
      <TransactionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        editData={{
          id: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          date: transaction.date,
          notes: transaction.notes,
          categoryId: transaction.category.id,
          fromWalletId: transaction.fromWallet?.id || null,
          receiptUrl: transaction.receiptUrl,
        }}
      />

      {/* Receipt Image Modal */}
      {showReceiptModal && transaction.receiptUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowReceiptModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={transaction.receiptUrl}
              alt="Receipt"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detail Transaksi
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Hapus"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Amount & Type */}
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-4xl mb-2">
                {transaction.type === "INCOME" ? "💰" : "💸"}
              </div>
              <div
                className={`text-4xl font-bold mb-2 ${
                  transaction.type === "INCOME"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {transaction.type === "INCOME" ? "+" : "-"}
                {formatCurrency(transaction.amount)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {transaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Description */}
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Deskripsi
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-white">
                    {transaction.description}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Tanggal
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-white">
                    {formatDate(transaction.date)}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Kategori
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-white">
                    {transaction.category.icon && (
                      <span className="mr-2">{transaction.category.icon}</span>
                    )}
                    {transaction.category.name}
                  </div>
                </div>
              </div>

              {/* Wallet */}
              {transaction.fromWallet && (
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Wallet
                    </div>
                    <div className="text-base font-medium text-gray-900 dark:text-white">
                      {transaction.fromWallet.name}
                    </div>
                  </div>
                </div>
              )}

              {/* User */}
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Dibuat oleh
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
                      {transaction.user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-base font-medium text-gray-900 dark:text-white">
                      {transaction.user.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {transaction.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Catatan
                    </div>
                    <div className="text-base text-gray-900 dark:text-white mt-1">
                      {transaction.notes}
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt */}
              {transaction.receiptUrl && (
                <div className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Struk
                    </div>
                    <div
                      onClick={() => setShowReceiptModal(true)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={transaction.receiptUrl}
                        alt="Receipt"
                        className="w-full max-w-sm h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Klik untuk melihat gambar penuh
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
