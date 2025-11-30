"use client";

import React, { useState } from "react";
import { Modal, Button, Select, Alert } from "../ui";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { exportBudgetsToPDF, exportBudgetsToExcel } from "@/lib/export";

interface ExportBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: any[];
  month: string;
}

export default function ExportBudgetModal({
  isOpen,
  onClose,
  budgets,
  month,
}: ExportBudgetModalProps) {
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = () => {
    setError("");
    setIsExporting(true);

    try {
      if (budgets.length === 0) {
        setError("Tidak ada anggaran untuk diekspor");
        setIsExporting(false);
        return;
      }

      // Export based on format
      if (format === "pdf") {
        exportBudgetsToPDF(budgets, month);
      } else {
        exportBudgetsToExcel(budgets, month);
      }

      // Close modal after successful export
      setTimeout(() => {
        setIsExporting(false);
        onClose();
        setFormat("pdf");
      }, 500);
    } catch (err) {
      console.error("Export error:", err);
      setError("Gagal mengekspor data. Silakan coba lagi.");
      setIsExporting(false);
    }
  };

  const monthYear = `${month.substring(4, 6)}/${month.substring(0, 4)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ekspor Anggaran" size="md">
      <div className="space-y-4">
        {error && <Alert variant="danger" message={error} />}

        {/* Month Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Periode Anggaran
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {monthYear}
          </p>
        </div>

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

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {budgets.length} anggaran akan diekspor untuk bulan {monthYear}
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
