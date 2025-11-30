import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { getMonthInt, getMonthDateRange } from "@/lib/date-helpers";

interface SpendingPattern {
  category: string;
  averageAmount: number;
  frequency: number;
  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number;
}

interface Anomaly {
  type: "high_spending" | "unusual_category" | "budget_breach" | "income_drop";
  severity: "low" | "medium" | "high";
  description: string;
  amount?: number;
  category?: string;
  date?: Date;
}

interface Recommendation {
  type: "savings" | "budget" | "category" | "goal" | "general";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialSavings?: number;
  actionable: boolean;
}

/**
 * GET /api/reports/insights
 * Intelligent financial insights with patterns, anomalies, and recommendations
 * Query params:
 * - months: number of months to analyze (default: 3)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user || !user.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthsToAnalyze = parseInt(searchParams.get("months") || "3");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsToAnalyze);

    // Get all transactions in the period
    const transactions = await prisma.transaction.findMany({
      where: {
        familyId: user.familyId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        category: true,
      },
      orderBy: { date: "asc" },
    });

    // === SPENDING PATTERNS ANALYSIS ===
    const spendingPatterns = await analyzeSpendingPatterns(
      user.familyId,
      startDate,
      endDate,
      monthsToAnalyze
    );

    // === ANOMALY DETECTION ===
    const anomalies = await detectAnomalies(
      user.familyId,
      transactions,
      startDate,
      endDate
    );

    // === RECOMMENDATIONS ===
    const recommendations = await generateRecommendations(
      user.familyId,
      transactions,
      spendingPatterns,
      anomalies,
      startDate,
      endDate
    );

    // === PREDICTIVE INSIGHTS ===
    const predictions = await generatePredictions(
      user.familyId,
      startDate,
      endDate,
      monthsToAnalyze
    );

    // === SAVINGS OPPORTUNITIES ===
    const savingsOpportunities = await findSavingsOpportunities(
      user.familyId,
      spendingPatterns,
      startDate,
      endDate
    );

    // === FINANCIAL HEALTH SCORE ===
    const healthScore = await calculateFinancialHealthScore(
      user.familyId,
      transactions,
      startDate,
      endDate
    );

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        monthsAnalyzed: monthsToAnalyze,
      },
      healthScore,
      spendingPatterns,
      anomalies,
      recommendations: recommendations.sort(
        (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority)
      ),
      predictions,
      savingsOpportunities,
      summary: {
        totalRecommendations: recommendations.length,
        highPriorityRecommendations: recommendations.filter(
          (r) => r.priority === "high"
        ).length,
        totalAnomalies: anomalies.length,
        criticalAnomalies: anomalies.filter((a) => a.severity === "high")
          .length,
        potentialMonthlySavings: savingsOpportunities.reduce(
          (sum, s) => sum + s.potentialSavings,
          0
        ),
      },
    });
  } catch (error) {
    console.error("[Financial Insights] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get insights",
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze spending patterns by category
 */
async function analyzeSpendingPatterns(
  familyId: string,
  startDate: Date,
  endDate: Date,
  months: number
): Promise<SpendingPattern[]> {
  const categoryStats = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      familyId,
      type: "EXPENSE",
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: true,
    _avg: { amount: true },
  });

  const patterns: SpendingPattern[] = [];

  for (const stat of categoryStats) {
    const category = stat.categoryId
      ? await prisma.category.findUnique({ where: { id: stat.categoryId } })
      : null;

    // Calculate trend by comparing first half vs second half
    const midDate = new Date(
      startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2
    );

    const firstHalf = await prisma.transaction.aggregate({
      where: {
        familyId,
        categoryId: stat.categoryId,
        type: "EXPENSE",
        date: { gte: startDate, lt: midDate },
      },
      _sum: { amount: true },
    });

    const secondHalf = await prisma.transaction.aggregate({
      where: {
        familyId,
        categoryId: stat.categoryId,
        type: "EXPENSE",
        date: { gte: midDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const firstAmount = Number(firstHalf._sum.amount || 0);
    const secondAmount = Number(secondHalf._sum.amount || 0);
    const trendPercentage =
      firstAmount > 0 ? ((secondAmount - firstAmount) / firstAmount) * 100 : 0;

    let trend: "increasing" | "decreasing" | "stable";
    if (trendPercentage > 10) trend = "increasing";
    else if (trendPercentage < -10) trend = "decreasing";
    else trend = "stable";

    patterns.push({
      category: category?.name || "Uncategorized",
      averageAmount: Number(stat._avg.amount || 0),
      frequency: stat._count,
      trend,
      trendPercentage,
    });
  }

  return patterns.sort((a, b) => b.averageAmount - a.averageAmount);
}

/**
 * Detect spending anomalies
 */
async function detectAnomalies(
  familyId: string,
  transactions: any[],
  startDate: Date,
  endDate: Date
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // Calculate average spending per transaction
  const expenses = transactions.filter((t) => t.type === "EXPENSE");
  const avgExpense =
    expenses.reduce((sum, t) => sum + Number(t.amount), 0) / expenses.length;
  const stdDev = calculateStdDev(expenses.map((t) => Number(t.amount)));

  // Detect unusually high transactions (2 standard deviations above mean)
  const threshold = avgExpense + 2 * stdDev;
  const highSpending = expenses.filter((t) => Number(t.amount) > threshold);

  highSpending.forEach((tx) => {
    anomalies.push({
      type: "high_spending",
      severity: Number(tx.amount) > avgExpense + 3 * stdDev ? "high" : "medium",
      description: `Transaksi tidak biasa: ${
        tx.description
      } sebesar Rp ${Number(tx.amount).toLocaleString("id-ID")}`,
      amount: Number(tx.amount),
      category: tx.category?.name,
      date: tx.date,
    });
  });

  // Detect budget breaches
  const currentMonth = new Date();
  const currentYear = currentMonth.getFullYear();
  const budgets = await prisma.budget.findMany({
    where: {
      familyId,
      year: currentYear,
    },
    include: { category: true },
  });

  for (const budget of budgets) {
    if (!budget.month || !budget.year) continue;

    const { start: monthStart, end: monthEnd } = getMonthDateRange(
      budget.month
    );

    const spent = await prisma.transaction.aggregate({
      where: {
        familyId,
        categoryId: budget.categoryId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const spentAmount = Number(spent._sum.amount || 0);
    const budgetAmount = Number(budget.amount);

    if (spentAmount > budgetAmount) {
      const overage = spentAmount - budgetAmount;
      const percentage = (overage / budgetAmount) * 100;

      anomalies.push({
        type: "budget_breach",
        severity: percentage > 50 ? "high" : percentage > 20 ? "medium" : "low",
        description: `Budget kategori "${
          budget.category?.name || "Uncategorized"
        }" terlampaui ${percentage.toFixed(1)}%`,
        amount: overage,
        category: budget.category?.name,
      });
    }
  }

  // Detect income drops
  const monthlyIncome: number[] = [];
  for (let i = 0; i < 3; i++) {
    const monthStart = new Date(endDate);
    monthStart.setMonth(monthStart.getMonth() - i);
    monthStart.setDate(1);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const income = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    monthlyIncome.push(Number(income._sum.amount || 0));
  }

  if (monthlyIncome.length >= 2) {
    const currentIncome = monthlyIncome[0];
    const previousIncome = monthlyIncome[1];

    if (previousIncome > 0 && currentIncome < previousIncome * 0.8) {
      const drop = ((previousIncome - currentIncome) / previousIncome) * 100;

      anomalies.push({
        type: "income_drop",
        severity: drop > 50 ? "high" : drop > 30 ? "medium" : "low",
        description: `Pendapatan bulan ini turun ${drop.toFixed(
          1
        )}% dari bulan lalu`,
        amount: previousIncome - currentIncome,
      });
    }
  }

  return anomalies;
}

/**
 * Generate personalized recommendations
 */
async function generateRecommendations(
  familyId: string,
  transactions: any[],
  patterns: SpendingPattern[],
  anomalies: Anomaly[],
  startDate: Date,
  endDate: Date
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // Analyze income vs expenses
  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  // Recommendation: Improve savings rate
  if (savingsRate < 20) {
    recommendations.push({
      type: "savings",
      priority: "high",
      title: "Tingkatkan Tingkat Tabungan",
      description: `Tingkat tabungan Anda saat ini ${savingsRate.toFixed(
        1
      )}%. Disarankan minimal 20%. Coba kurangi pengeluaran atau tingkatkan pendapatan.`,
      actionable: true,
    });
  }

  // Recommendation: Categories with increasing trends
  const increasingCategories = patterns.filter(
    (p) => p.trend === "increasing" && p.trendPercentage > 20
  );

  increasingCategories.forEach((category) => {
    recommendations.push({
      type: "category",
      priority: category.trendPercentage > 50 ? "high" : "medium",
      title: `Pengeluaran ${category.category} Meningkat`,
      description: `Pengeluaran di kategori ${
        category.category
      } meningkat ${category.trendPercentage.toFixed(
        1
      )}%. Review dan identifikasi penyebabnya.`,
      actionable: true,
    });
  });

  // Recommendation: Set budgets for unbudgeted categories
  const budgets = await prisma.budget.findMany({
    where: { familyId },
    select: { categoryId: true },
  });

  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const unbudgetedCategories = patterns.filter(
    (p) => !budgetedCategoryIds.has(p.category) && p.averageAmount > 100000
  );

  if (unbudgetedCategories.length > 0) {
    recommendations.push({
      type: "budget",
      priority: "medium",
      title: "Buat Budget untuk Kategori Baru",
      description: `Ada ${unbudgetedCategories.length} kategori dengan pengeluaran signifikan yang belum memiliki budget. Buat budget untuk kontrol lebih baik.`,
      actionable: true,
    });
  }

  // Recommendation: Emergency fund
  const wallets = await prisma.wallet.findMany({
    where: { familyId },
  });

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const monthlyExpenses = expenses / 3; // avg of last 3 months
  const emergencyFundMonths =
    monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 0;

  if (emergencyFundMonths < 3) {
    recommendations.push({
      type: "savings",
      priority: "high",
      title: "Dana Darurat Kurang",
      description: `Dana darurat Anda hanya cukup untuk ${emergencyFundMonths.toFixed(
        1
      )} bulan. Disarankan minimal 3-6 bulan pengeluaran (Rp ${(
        monthlyExpenses * 3
      ).toLocaleString("id-ID")}).`,
      potentialSavings: monthlyExpenses * 3 - totalBalance,
      actionable: true,
    });
  }

  // Recommendation: Goals progress
  const goals = await prisma.goal.findMany({
    where: {
      familyId,
      status: "ACTIVE",
    },
  });

  for (const goal of goals) {
    const contributions = await prisma.goalContribution.aggregate({
      where: { goalId: goal.id },
      _sum: { amount: true },
    });

    const contributed = Number(contributions._sum.amount || 0);
    const target = Number(goal.targetAmount);
    const progress = (contributed / target) * 100;

    if (goal.deadline) {
      const daysToTarget = Math.ceil(
        (goal.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      const remaining = target - contributed;
      const requiredMonthly = remaining / (daysToTarget / 30);

      if (daysToTarget > 0 && daysToTarget < 180 && progress < 50) {
        recommendations.push({
          type: "goal",
          priority: "medium",
          title: `Percepat Goal: ${goal.name}`,
          description: `Target "${
            goal.name
          }" kurang dari 6 bulan lagi, tapi baru ${progress.toFixed(
            1
          )}% tercapai. Butuh Rp ${requiredMonthly.toLocaleString(
            "id-ID"
          )}/bulan.`,
          actionable: true,
        });
      }
    }
  }

  return recommendations;
}

/**
 * Generate predictions for next month
 */
async function generatePredictions(
  familyId: string,
  startDate: Date,
  endDate: Date,
  months: number
) {
  // Calculate monthly averages
  const monthlyData: { income: number; expense: number }[] = [];

  for (let i = 0; i < months; i++) {
    const monthStart = new Date(endDate);
    monthStart.setMonth(monthStart.getMonth() - i);
    monthStart.setDate(1);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const income = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const expense = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    monthlyData.push({
      income: Number(income._sum.amount || 0),
      expense: Number(expense._sum.amount || 0),
    });
  }

  // Simple linear regression for prediction
  const avgIncome =
    monthlyData.reduce((sum, d) => sum + d.income, 0) / monthlyData.length;
  const avgExpense =
    monthlyData.reduce((sum, d) => sum + d.expense, 0) / monthlyData.length;

  // Calculate trend
  const recentIncome =
    monthlyData.slice(0, 2).reduce((sum, d) => sum + d.income, 0) / 2;
  const olderIncome =
    monthlyData.slice(-2).reduce((sum, d) => sum + d.income, 0) / 2;
  const incomeTrend =
    olderIncome > 0 ? ((recentIncome - olderIncome) / olderIncome) * 100 : 0;

  const recentExpense =
    monthlyData.slice(0, 2).reduce((sum, d) => sum + d.expense, 0) / 2;
  const olderExpense =
    monthlyData.slice(-2).reduce((sum, d) => sum + d.expense, 0) / 2;
  const expenseTrend =
    olderExpense > 0
      ? ((recentExpense - olderExpense) / olderExpense) * 100
      : 0;

  const predictedIncome = avgIncome * (1 + incomeTrend / 100);
  const predictedExpense = avgExpense * (1 + expenseTrend / 100);
  const predictedSavings = predictedIncome - predictedExpense;

  return {
    nextMonth: {
      predictedIncome,
      predictedExpense,
      predictedSavings,
      confidence: months >= 3 ? "medium" : "low",
    },
    trends: {
      income:
        incomeTrend > 5
          ? "increasing"
          : incomeTrend < -5
          ? "decreasing"
          : "stable",
      expense:
        expenseTrend > 5
          ? "increasing"
          : expenseTrend < -5
          ? "decreasing"
          : "stable",
    },
    averages: {
      monthlyIncome: avgIncome,
      monthlyExpense: avgExpense,
    },
  };
}

/**
 * Find savings opportunities
 */
async function findSavingsOpportunities(
  familyId: string,
  patterns: SpendingPattern[],
  startDate: Date,
  endDate: Date
) {
  const opportunities: Array<{
    category: string;
    currentSpending: number;
    suggestedReduction: number;
    potentialSavings: number;
    difficulty: "easy" | "medium" | "hard";
    description: string;
  }> = [];

  // Identify categories with high spending that could be reduced
  const highSpendingCategories = patterns
    .filter((p) => p.averageAmount > 500000)
    .slice(0, 5);

  for (const category of highSpendingCategories) {
    const totalSpent = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "EXPENSE",
        category: { name: category.category },
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const currentSpending = Number(totalSpent._sum.amount || 0);

    // Suggest 10-20% reduction based on category
    const reductionPercentage = category.trend === "increasing" ? 20 : 10;
    const suggestedReduction = (currentSpending * reductionPercentage) / 100;

    opportunities.push({
      category: category.category,
      currentSpending,
      suggestedReduction: reductionPercentage,
      potentialSavings: suggestedReduction,
      difficulty:
        reductionPercentage >= 20
          ? "hard"
          : reductionPercentage >= 15
          ? "medium"
          : "easy",
      description: `Kurangi pengeluaran ${
        category.category
      } sebesar ${reductionPercentage}% untuk menghemat Rp ${suggestedReduction.toLocaleString(
        "id-ID"
      )}/bulan`,
    });
  }

  return opportunities;
}

/**
 * Calculate financial health score (0-100)
 */
async function calculateFinancialHealthScore(
  familyId: string,
  transactions: any[],
  startDate: Date,
  endDate: Date
) {
  let score = 0;
  const breakdown: Record<
    string,
    { score: number; maxScore: number; description: string }
  > = {};

  // 1. Savings Rate (30 points)
  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const savingsScore = Math.min(30, (savingsRate / 30) * 30);
  score += savingsScore;
  breakdown.savingsRate = {
    score: savingsScore,
    maxScore: 30,
    description: `Savings rate: ${savingsRate.toFixed(1)}%`,
  };

  // 2. Budget Adherence (25 points)
  const budgets = await prisma.budget.count({ where: { familyId } });
  const budgetScore = budgets > 0 ? 25 : 0;
  score += budgetScore;
  breakdown.budgetAdherence = {
    score: budgetScore,
    maxScore: 25,
    description: `${budgets} active budgets`,
  };

  // 3. Emergency Fund (25 points)
  const wallets = await prisma.wallet.findMany({ where: { familyId } });
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const monthlyExpense = expenses / 3;
  const emergencyMonths =
    monthlyExpense > 0 ? totalBalance / monthlyExpense : 0;
  const emergencyScore = Math.min(25, (emergencyMonths / 6) * 25);
  score += emergencyScore;
  breakdown.emergencyFund = {
    score: emergencyScore,
    maxScore: 25,
    description: `${emergencyMonths.toFixed(1)} months of expenses`,
  };

  // 4. Goal Progress (20 points)
  const goals = await prisma.goal.findMany({
    where: { familyId, status: "ACTIVE" },
  });

  let totalGoalProgress = 0;
  for (const goal of goals) {
    const contributions = await prisma.goalContribution.aggregate({
      where: { goalId: goal.id },
      _sum: { amount: true },
    });
    const progress =
      (Number(contributions._sum.amount || 0) / Number(goal.targetAmount)) *
      100;
    totalGoalProgress += progress;
  }

  const avgGoalProgress =
    goals.length > 0 ? totalGoalProgress / goals.length : 0;
  const goalScore = Math.min(20, (avgGoalProgress / 100) * 20);
  score += goalScore;
  breakdown.goalProgress = {
    score: goalScore,
    maxScore: 20,
    description: `${goals.length} active goals, ${avgGoalProgress.toFixed(
      1
    )}% avg progress`,
  };

  return {
    score: Math.round(score),
    maxScore: 100,
    rating:
      score >= 80
        ? "Excellent"
        : score >= 60
        ? "Good"
        : score >= 40
        ? "Fair"
        : "Needs Improvement",
    breakdown,
  };
}

/**
 * Helper functions
 */
function calculateStdDev(numbers: number[]): number {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const variance =
    numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}

function priorityWeight(priority: string): number {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}
