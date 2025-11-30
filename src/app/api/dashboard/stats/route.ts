import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireFamily } from "@/lib/auth";

/**
 * Date Range Query Schema
 */
const DateRangeQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * GET /api/dashboard/stats
 *
 * Get comprehensive dashboard statistics for the user's family
 *
 * Query params (optional):
 * - startDate: ISO datetime string (defaults to start of current month)
 * - endDate: ISO datetime string (defaults to end of current month)
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/dashboard/stats');
 * const data = await response.json();
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();

    // Ensure user has a family
    await requireFamily(session);

    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const queryResult = DateRangeQuerySchema.safeParse({
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Parameter tanggal tidak valid",
          details: queryResult.error.errors,
        },
        { status: 400 }
      );
    }

    // Determine date range (default to current month)
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const startDate = queryResult.data.startDate
      ? new Date(queryResult.data.startDate)
      : defaultStartDate;
    const endDate = queryResult.data.endDate
      ? new Date(queryResult.data.endDate)
      : defaultEndDate;

    const familyId = session.familyId!;

    // Run all queries in parallel for performance
    const [
      summaryData,
      categoryBreakdown,
      budgetData,
      recentTransactions,
      assetsData,
      liabilitiesData,
      monthlyTrendData,
    ] = await Promise.all([
      // 1. Summary: Total income, expense, balance
      getSummaryStats(familyId, startDate, endDate),

      // 2. Category Breakdown
      getCategoryBreakdown(familyId, startDate, endDate),

      // 3. Budget Status
      getBudgetStatus(familyId, startDate),

      // 4. Recent Transactions (last 10)
      getRecentTransactions(familyId, 10),

      // 5. Total Assets
      getTotalAssets(familyId),

      // 6. Total Liabilities
      getTotalLiabilities(familyId),

      // 7. Monthly Trend (last 6 months)
      getMonthlyTrend(familyId, 6),
    ]);

    // Calculate net worth
    const netWorth = {
      totalAssets: assetsData,
      totalLiabilities: liabilitiesData,
      netWorth: assetsData - liabilitiesData,
    };

    return NextResponse.json({
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: summaryData,
      categoryBreakdown,
      budgetStatus: budgetData,
      netWorth,
      monthlyTrend: monthlyTrendData,
      recentTransactions,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);

    if (error instanceof Error && error.message.includes("required")) {
      return NextResponse.json(
        {
          error: error.message,
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat mengambil statistik dashboard",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * Get summary statistics (income, expense, balance)
 */
async function getSummaryStats(
  familyId: string,
  startDate: Date,
  endDate: Date
) {
  const transactions = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      familyId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  transactions.forEach((t) => {
    if (t.type === "INCOME") {
      totalIncome = t._sum.amount || 0;
      incomeCount = t._count.id;
    } else if (t.type === "EXPENSE") {
      totalExpense = t._sum.amount || 0;
      expenseCount = t._count.id;
    }
  });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: incomeCount + expenseCount,
    incomeCount,
    expenseCount,
  };
}

/**
 * Get category breakdown (expenses only)
 */
async function getCategoryBreakdown(
  familyId: string,
  startDate: Date,
  endDate: Date
) {
  const categoryTotals = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      familyId,
      type: "EXPENSE",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Get category details
  const categoryIds = categoryTotals
    .map((ct) => ct.categoryId)
    .filter((id): id is string => id !== null);

  if (categoryIds.length === 0) {
    return [];
  }

  const categories = await prisma.category.findMany({
    where: {
      id: { in: categoryIds },
    },
    select: {
      id: true,
      name: true,
      icon: true,
    },
  });

  // Create category lookup map
  const categoryMap = new Map(
    categories.map((c) => [c.id, { name: c.name, icon: c.icon }])
  );

  // Calculate total for percentage
  const total = categoryTotals.reduce(
    (sum, ct) => sum + (ct._sum.amount || 0),
    0
  );

  // Map category data
  return categoryTotals
    .map((ct) => {
      const categoryInfo = categoryMap.get(ct.categoryId!);
      const amount = ct._sum.amount || 0;

      return {
        categoryId: ct.categoryId!,
        categoryName: categoryInfo?.name || "Unknown",
        categoryIcon: categoryInfo?.icon || "📦",
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount); // Sort by amount descending
}

/**
 * Get budget status for current month
 */
async function getBudgetStatus(familyId: string, referenceDate: Date) {
  const month = referenceDate.getMonth() + 1;
  const year = referenceDate.getFullYear();

  // Get budgets for current month
  const budgets = await prisma.budget.findMany({
    where: {
      familyId,
      month,
      year,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    },
  });

  if (budgets.length === 0) {
    return [];
  }

  // Get actual spending for each budget category
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const categoryIds = budgets
    .map((b) => b.categoryId)
    .filter((id): id is string => id !== null);

  const spending = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      familyId,
      categoryId: { in: categoryIds },
      type: "EXPENSE",
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Create spending lookup map
  const spendingMap = new Map(
    spending.map((s) => [s.categoryId!, s._sum?.amount || 0])
  );

  // Map budget status
  return budgets.map((budget) => {
    const budgetAmount = Number(budget.amount);
    const spent = spendingMap.get(budget.categoryId || "") || 0;
    const remaining = Math.max(budgetAmount - spent, 0);
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    let status: "on_track" | "warning" | "exceeded" = "on_track";
    if (percentage >= 100) {
      status = "exceeded";
    } else if (percentage >= 80) {
      status = "warning";
    }

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category?.name || "Unknown",
      categoryIcon: budget.category?.icon || "📦",
      budgetAmount,
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
      actualPercentage: percentage,
      status,
    };
  });
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(familyId: string, limit: number = 10) {
  return prisma.transaction.findMany({
    where: {
      familyId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
          type: true,
        },
      },
      fromWallet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
    take: limit,
  });
}

/**
 * Get total assets value
 */
async function getTotalAssets(familyId: string) {
  const result = await prisma.asset.aggregate({
    where: {
      familyId,
    },
    _sum: {
      value: true,
    },
  });

  return result._sum?.value || 0;
}

/**
 * Get total liabilities amount
 */
async function getTotalLiabilities(familyId: string) {
  const result = await prisma.liability.aggregate({
    where: {
      familyId,
    },
    _sum: {
      remainingAmount: true,
    },
  });

  return result._sum?.remainingAmount || 0;
}

/**
 * Get monthly trend for last N months
 */
async function getMonthlyTrend(familyId: string, monthsCount: number = 6) {
  const now = new Date();
  const months: { month: string; income: number; expense: number }[] = [];

  // Generate last N months
  for (let i = monthsCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get transactions for this month
    const transactions = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        familyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === "INCOME") {
        income = t._sum.amount || 0;
      } else if (t.type === "EXPENSE") {
        expense = t._sum.amount || 0;
      }
    });

    // Format: YYYY-MM
    const monthLabel = `${year}-${String(month).padStart(2, "0")}`;

    months.push({
      month: monthLabel,
      income,
      expense,
    });
  }

  return months;
}
