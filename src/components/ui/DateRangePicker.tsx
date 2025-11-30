"use client";

import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  label?: string;
  showPresets?: boolean;
  className?: string;
}

type PresetRange = {
  label: string;
  getDates: () => { start: string; end: string };
};

export default function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  label = "Periode",
  showPresets = true,
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  const presets: PresetRange[] = [
    {
      label: "Hari Ini",
      getDates: () => {
        const today = new Date().toISOString().split("T")[0];
        return { start: today, end: today };
      },
    },
    {
      label: "7 Hari Terakhir",
      getDates: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "30 Hari Terakhir",
      getDates: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "Bulan Ini",
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "Bulan Lalu",
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "Tahun Ini",
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "Semua Waktu",
      getDates: () => {
        return { start: "", end: "" };
      },
    },
  ];

  const handlePresetClick = (preset: PresetRange) => {
    const { start, end } = preset.getDates();
    setTempStartDate(start);
    setTempEndDate(end);
    onRangeChange(start, end);
    setIsOpen(false);
  };

  const handleApply = () => {
    // Validate dates
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir");
      return;
    }
    onRangeChange(tempStartDate, tempEndDate);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempStartDate("");
    setTempEndDate("");
    onRangeChange("", "");
    setIsOpen(false);
  };

  const formatDateDisplay = (start: string, end: string): string => {
    if (!start && !end) return "Semua Waktu";

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    };

    if (start && end) {
      if (start === end) {
        return formatDate(start);
      }
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    if (start) return `Dari ${formatDate(start)}`;
    if (end) return `Sampai ${formatDate(end)}`;
    return "Pilih Tanggal";
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <span className="text-sm truncate">
              {formatDateDisplay(startDate, endDate)}
            </span>
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute z-50 mt-2 w-full md:w-[500px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Presets */}
              {showPresets && (
                <div className="md:w-40 space-y-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                    PRESET
                  </p>
                  {presets.map((preset, index) => {
                    const { start, end } = preset.getDates();
                    const isActive = start === startDate && end === endDate;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive
                            ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom Date Inputs */}
              <div className="flex-1 space-y-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  CUSTOM RANGE
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    max={tempEndDate || undefined}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    min={tempStartDate || undefined}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
