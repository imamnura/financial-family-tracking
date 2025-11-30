"use client";

import React, { useState } from "react";
import { Modal, Button, Input, Select, Alert } from "../ui";
import { Download, FileText, FileSpreadsheet, Calendar } from "lucide-react";
import {
  exportTransactionsToPDF,
  exportTransactionsToExcel,
  ExportTransaction,
} from "@/lib/export";

interface ExportTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: ExportTransaction[];
}

export default function ExportTransactionModal({
  isOpen,
  onClose,
  transactions,
}: ExportTransactionModalProps) {
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = () => {
    setError("");
    setIsExporting(true);

    try {
      // Filter transactions based on criteria
      let filteredTransactions = [...transactions];

      // Filter by date range
      if (startDate && endDate) {
        filteredTransactions = filteredTransactions.filter((t) => {
          const transactionDate = new Date(t.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return transactionDate >= start && transactionDate <= end;
        });
      }

      // Filter by type
      if (type !== "ALL") {
        filteredTransactions = filteredTransactions.filter(
          (t) => t.type === type
        );
      }

      if (filteredTransactions.length === 0) {
        setError("Tidak ada transaksi yang sesuai dengan filter yang dipilih");
        setIsExporting(false);
        return;
      }

      // Sort by date (newest first)
      filteredTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Export based on format
      const options = {
        startDate,
        endDate,
        type,
      };

      if (format === "pdf") {
        exportTransactionsToPDF(filteredTransactions, options);
      } else {
        exportTransactionsToExcel(filteredTransactions, options);
      }

      // Close modal after successful export
      setTimeout(() => {
        setIsExporting(false);
        onClose();
        // Reset form
        setStartDate("");
        setEndDate("");
        setType("ALL");
        setFormat("pdf");
      }, 500);
    } catch (err) {
      console.error("Export error:", err);
      setError("Gagal mengekspor data. Silakan coba lagi.");
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ekspor Transaksi" size="md">
      <div className="space-y-4">
        {error && <Alert variant="danger" message={error} />}

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Format Ekspor
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat("pdf")}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                format === "pdf"
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <FileText
                className={`w-5 h-5 ${
                  format === "pdf" ? "text-indigo-600" : "text-gray-500"
                }`}
              />
              <span
                className={`font-medium ${
                  format === "pdf"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                PDF
              </span>
            </button>

            <button
              onClick={() => setFormat("excel")}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                format === "excel"
                  ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <FileSpreadsheet
                className={`w-5 h-5 ${
                  format === "excel" ? "text-green-600" : "text-gray-500"
                }`}
              />
              <span
                className={`font-medium ${
                  format === "excel"
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                Excel
              </span>
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Tanggal Mulai"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
          <Input
            type="date"
            label="Tanggal Akhir"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>

        {/* Type Filter */}
        <Select
          label="Tipe Transaksi"
          value={type}
          onChange={(e) =>
            setType(e.target.value as "ALL" | "INCOME" | "EXPENSE")
          }
          options={[
            { value: "ALL", label: "Semua Transaksi" },
            { value: "INCOME", label: "Pemasukan" },
            { value: "EXPENSE", label: "Pengeluaran" },
          ]}
        />

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {transactions.length} transaksi akan diekspor
            {startDate && endDate && " dalam rentang tanggal yang dipilih"}
            {type !== "ALL" &&
              ` (hanya ${type === "INCOME" ? "pemasukan" : "pengeluaran"})`}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isExporting}>
          Batal
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          isLoading={isExporting}
          leftIcon={<Download className="w-4 h-4" />}
        >
          {isExporting ? "Mengekspor..." : "Ekspor"}
        </Button>
      </div>
    </Modal>
  );
}
