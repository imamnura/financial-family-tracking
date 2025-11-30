"use client";

import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import { exportChartToImage, copyChartToClipboard } from "@/lib/chartExport";

interface ChartExportButtonProps {
  chartId: string;
  filename?: string;
  className?: string;
}

export default function ChartExportButton({
  chartId,
  filename = "chart.png",
  className = "",
}: ChartExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setShowMenu(false);
    try {
      await exportChartToImage(chartId, filename, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
    } catch (error) {
      console.error("Export failed:", error);
      alert("Gagal mengekspor chart");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    setShowMenu(false);
    try {
      await copyChartToClipboard(chartId, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Gagal menyalin chart");
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        title="Export Chart"
      >
        {isCopied ? (
          <Check className="w-5 h-5 text-green-600" />
        ) : (
          <Download className="w-5 h-5" />
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy to Clipboard</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
