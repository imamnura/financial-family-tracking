"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Target,
  TrendingUp,
  Calendar,
  Search,
  Filter,
} from "lucide-react";
import GoalCard from "@/components/goals/GoalCard";
import GoalModal from "@/components/goals/GoalModal";
import ContributionModal from "@/components/goals/ContributionModal";
import { GoalType } from "@/types/goal";

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<GoalType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  >("ACTIVE");

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    filterGoals();
  }, [goals, searchQuery, statusFilter]);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/goals");
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterGoals = () => {
    let filtered = goals;

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((goal) => goal.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (goal) =>
          goal.name.toLowerCase().includes(query) ||
          goal.description?.toLowerCase().includes(query)
      );
    }

    setFilteredGoals(filtered);
  };

  const handleAddGoal = () => {
    setSelectedGoal(null);
    setShowGoalModal(true);
  };

  const handleEditGoal = (goal: GoalType) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const handleContribute = (goal: GoalType) => {
    setSelectedGoal(goal);
    setShowContributeModal(true);
  };

  const handleCloseGoalModal = () => {
    setShowGoalModal(false);
    setSelectedGoal(null);
  };

  const handleCloseContributeModal = () => {
    setShowContributeModal(false);
    setSelectedGoal(null);
  };

  const handleGoalSuccess = () => {
    handleCloseGoalModal();
    fetchGoals();
  };

  const handleContributeSuccess = () => {
    handleCloseContributeModal();
    fetchGoals();
  };

  // Calculate statistics
  const stats = {
    totalGoals: goals.filter((g) => g.status === "ACTIVE").length,
    completedGoals: goals.filter((g) => g.status === "COMPLETED").length,
    totalTarget: goals
      .filter((g) => g.status === "ACTIVE")
      .reduce((sum, g) => sum + g.targetAmount, 0),
    totalSaved: goals
      .filter((g) => g.status === "ACTIVE")
      .reduce((sum, g) => sum + g.currentAmount, 0),
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      {/* Goal Modal */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={handleCloseGoalModal}
        onSuccess={handleGoalSuccess}
        editData={selectedGoal}
      />

      {/* Contribution Modal */}
      {selectedGoal && (
        <ContributionModal
          isOpen={showContributeModal}
          onClose={handleCloseContributeModal}
          onSuccess={handleContributeSuccess}
          goal={selectedGoal}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Financial Goals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Kelola dan pantau tujuan keuangan keluarga Anda
            </p>
          </div>
          <button
            onClick={handleAddGoal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Goal</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Goal Aktif
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalGoals}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tercapai
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completedGoals}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Target
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalTarget)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Terkumpul
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalSaved)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari goal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="COMPLETED">Tercapai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Goals Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-8 w-8 text-primary-600"
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Tidak ada goal
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery || statusFilter !== "ACTIVE"
                ? "Tidak ada goal yang sesuai dengan filter"
                : "Mulai dengan menambahkan goal keuangan pertama Anda"}
            </p>
            {!searchQuery && statusFilter === "ACTIVE" && (
              <button
                onClick={handleAddGoal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Goal</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onContribute={handleContribute}
                onRefresh={fetchGoals}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
