"use client";

import { useEffect, useState } from "react";
import { FamilySettingsForm } from "@/components/family/FamilySettingsForm";
import { ActivityTimeline } from "@/components/family/ActivityTimeline";

type Tab = "general" | "activity";

export default function FamilySettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const tabs = [
    { id: "general" as Tab, name: "Pengaturan Umum", icon: "⚙️" },
    { id: "activity" as Tab, name: "Riwayat Aktivitas", icon: "📊" },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pengaturan Keluarga
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola preferensi dan lihat riwayat aktivitas keluarga
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "general" && <FamilySettingsForm />}
          {activeTab === "activity" && <ActivityTimeline />}
        </div>
      </div>
    </div>
  );
}
