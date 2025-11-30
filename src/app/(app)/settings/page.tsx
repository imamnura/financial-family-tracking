"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Globe,
  Lock,
  Shield,
  Database,
  Trash2,
} from "lucide-react";
import { Card, Button, Select, Badge } from "@/components/ui";
import { toast } from "@/store/useNotificationStore";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState("id");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    budget: true,
    transaction: true,
  });

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);

    // Apply theme
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    toast.success("Tema berhasil diubah", `Tema sekarang: ${newTheme}`);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    toast.success("Bahasa berhasil diubah");
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    toast.info("Pengaturan notifikasi diperbarui");
  };

  const handleExportData = () => {
    toast.info(
      "Mengekspor data...",
      "Proses akan memakan waktu beberapa detik"
    );
    // Simulate export
    setTimeout(() => {
      toast.success("Data berhasil diekspor", "File telah diunduh");
    }, 2000);
  };

  const handleClearCache = () => {
    toast.warning("Cache dihapus", "Halaman akan dimuat ulang");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SettingsIcon className="w-8 h-8" />
            Pengaturan
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Kelola preferensi dan pengaturan aplikasi Anda
          </p>
        </div>

        {/* Appearance */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
            Tampilan
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tema
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "light"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                  <span className="text-sm font-medium">Terang</span>
                </button>

                <button
                  onClick={() => handleThemeChange("dark")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "dark"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Moon className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium">Gelap</span>
                </button>

                <button
                  onClick={() => handleThemeChange("system")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "system"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <SettingsIcon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                  <span className="text-sm font-medium">Sistem</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Bahasa
              </label>
              <Select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                options={[
                  { value: "id", label: "Bahasa Indonesia" },
                  { value: "en", label: "English" },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifikasi
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Terima notifikasi via email
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle("email")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.email
                    ? "bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.email ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Push Notifications
                  <Badge variant="warning" size="sm" className="ml-2">
                    Beta
                  </Badge>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Notifikasi browser push
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle("push")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.push
                    ? "bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.push ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Budget Alerts
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Peringatan saat mendekati batas budget
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle("budget")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.budget
                    ? "bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.budget ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Transaction Notifications
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Notifikasi untuk setiap transaksi baru
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle("transaction")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.transaction
                    ? "bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.transaction
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Privacy & Security */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privasi & Keamanan
          </h2>

          <div className="space-y-3">
            <Button
              variant="outline"
              leftIcon={<Lock className="w-4 h-4" />}
              fullWidth
              onClick={() => toast.info("Fitur akan segera hadir")}
            >
              Ubah Password
            </Button>

            <Button
              variant="outline"
              leftIcon={<Shield className="w-4 h-4" />}
              fullWidth
              onClick={() => toast.info("Fitur akan segera hadir")}
            >
              Two-Factor Authentication
            </Button>
          </div>
        </Card>

        {/* Data Management */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Manajemen Data
          </h2>

          <div className="space-y-3">
            <Button
              variant="outline"
              leftIcon={<Database className="w-4 h-4" />}
              fullWidth
              onClick={handleExportData}
            >
              Export Semua Data
            </Button>

            <Button
              variant="outline"
              leftIcon={<Trash2 className="w-4 h-4" />}
              fullWidth
              onClick={handleClearCache}
            >
              Hapus Cache
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card
          variant="bordered"
          padding="lg"
          className="border-red-200 dark:border-red-800"
        >
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>

          <div className="space-y-3">
            <Button
              variant="danger"
              leftIcon={<Trash2 className="w-4 h-4" />}
              fullWidth
              onClick={() => {
                if (confirm("Apakah Anda yakin ingin menghapus semua data?")) {
                  toast.error("Fitur hapus akun belum tersedia");
                }
              }}
            >
              Hapus Akun
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus
            permanen.
          </p>
        </Card>
      </div>
    </div>
  );
}
