import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import {
  getMonthInt,
  getMonthDateRange,
  monthIntToDate,
} from "@/lib/date-helpers";

/**
 * GET /api/budget/realization
 * Monitor budget realization with trend analysis
 * Query params:
 * - year: number
 * - month: number (optional)
 * - categoryId: string (optional)
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
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString()
    );
    const monthParam = searchParams.get("month");
    const categoryId = searchParams.get("categoryId");

    const familyId = user.familyId!;

    // Build filter
    const budgetFilter: any = {
      familyId,
      year,
    };

    if (monthParam) {
      const month = parseInt(monthParam);
      budgetFilter.month = getMonthInt(new Date(year, month - 1, 1));
    }

    if (categoryId) {
      budgetFilter.categoryId = categoryId;
    }

    // Fetch budgets
    const budgets = await prisma.budget.findMany({
      where: budgetFilter,
      include: {
        category: true,
      },
      orderBy: [{ month: "asc" }],
    });

    // Calculate realization for each budget
    const realizationData = await Promise.all(
      budgets.map(async (budget) => {
        if (!budget.month || !budget.year) return null;

        const { start, end } = getMonthDateRange(budget.month);

        // Get transactions for this budget
        const transactions = await prisma.transaction.findMany({
          where: {
            familyId,
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: { gte: start, lte: end },
          },
          orderBy: { date: "asc" },
        });

        const actualSpent = transactions.reduce(
          (sum, tx) => sum + Number(tx.amount),
          0
        );
        const budgetAmount = Number(budget.amount);
        const realizationRate = (actualSpent / budgetAmount) * 100;
        const variance = actualSpent - budgetAmount;
        const variancePercentage = (variance / budgetAmount) * 100;

        // Calculate daily realization progress
        const monthValue = budget.month!; // Already checked above
        const yearValue = budget.year!; // Already checked above
        const daysInMonth = new Date(yearValue, monthValue % 100, 0).getDate();
        const dailyProgress = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayDate = new Date(yearValue, (monthValue % 100) - 1, day);
          const dayTransactions = transactions.filter(
            (tx) => new Date(tx.date).getDate() === day
          );
          const daySpent = dayTransactions.reduce(
            (sum, tx) => sum + Number(tx.amount),
            0
          );
          const cumulativeSpent = transactions
            .filter((tx) => new Date(tx.date).getDate() <= day)
            .reduce((sum, tx) => sum + Number(tx.amount), 0);

          return {
            day,
            date: dayDate,
            dailySpent: daySpent,
            cumulativeSpent,
            cumulativePercentage: (cumulativeSpent / budgetAmount) * 100,
            transactionCount: dayTransactions.length,
          };
        });

        // Calculate trend (last 7 days)
        const last7Days = dailyProgress.slice(-7);
        const avgDailySpend =
          last7Days.reduce((sum, d) => sum + d.dailySpent, 0) / 7;
        const trend =
          avgDailySpend > budgetAmount / daysInMonth
            ? "increasing"
            : "decreasing";

        // Performance metrics
        const targetDailySpend = budgetAmount / daysInMonth;
        const actualDailySpend =
          actualSpent / Math.min(new Date().getDate(), daysInMonth);
        const efficiency = (targetDailySpend / actualDailySpend) * 100;

        // Grade the realization
        let grade: "A" | "B" | "C" | "D" | "F";
        if (realizationRate <= 70) grade = "A";
        else if (realizationRate <= 85) grade = "B";
        else if (realizationRate <= 100) grade = "C";
        else if (realizationRate <= 120) grade = "D";
        else grade = "F";

        return {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category?.name || "Uncategorized",
          period: {
            year: budget.year,
            month: budget.month,
            monthName: monthIntToDate(budget.month).toLocaleDateString(
              "id-ID",
              {
                month: "long",
                year: "numeric",
              }
            ),
          },
          budget: {
            planned: budgetAmount,
            actual: actualSpent,
            remaining: budgetAmount - actualSpent,
            realizationRate,
            variance,
            variancePercentage,
          },
          performance: {
            grade,
            efficiency,
            targetDailySpend,
            actualDailySpend,
            trend,
            avgLast7Days: avgDailySpend,
          },
          metrics: {
            transactionCount: transactions.length,
            avgTransactionSize:
              transactions.length > 0 ? actualSpent / transactions.length : 0,
            largestTransaction: Math.max(
              ...transactions.map((t) => Number(t.amount)),
              0
            ),
            smallestTransaction:
              transactions.length > 0
                ? Math.min(...transactions.map((t) => Number(t.amount)))
                : 0,
          },
          dailyProgress,
          status:
            realizationRate <= 100
              ? realizationRate <= 90
                ? "excellent"
                : "good"
              : realizationRate <= 110
              ? "warning"
              : "over",
        };
      })
    );

    // Filter out null entries
    const validRealization = realizationData.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    // Overall summary
    const summary = {
      totalBudgets: validRealization.length,
      totalPlanned: validRealization.reduce(
        (sum, r) => sum + r.budget.planned,
        0
      ),
      totalActual: validRealization.reduce(
        (sum, r) => sum + r.budget.actual,
        0
      ),
      totalRemaining: validRealization.reduce(
        (sum, r) => sum + r.budget.remaining,
        0
      ),
      overallRealizationRate:
        validRealization.length > 0
          ? (validRealization.reduce((sum, r) => sum + r.budget.actual, 0) /
              validRealization.reduce((sum, r) => sum + r.budget.planned, 0)) *
            100
          : 0,
      gradeDistribution: {
        A: validRealization.filter((r) => r.performance.grade === "A").length,
        B: validRealization.filter((r) => r.performance.grade === "B").length,
        C: validRealization.filter((r) => r.performance.grade === "C").length,
        D: validRealization.filter((r) => r.performance.grade === "D").length,
        F: validRealization.filter((r) => r.performance.grade === "F").length,
      },
      statusDistribution: {
        excellent: validRealization.filter((r) => r.status === "excellent")
          .length,
        good: validRealization.filter((r) => r.status === "good").length,
        warning: validRealization.filter((r) => r.status === "warning").length,
        over: validRealization.filter((r) => r.status === "over").length,
      },
    };

    // Best and worst performers
    const sortedByRealization = [...validRealization].sort(
      (a, b) => a.budget.realizationRate - b.budget.realizationRate
    );
    const bestPerformers = sortedByRealization.slice(0, 3);
    const worstPerformers = sortedByRealization.slice(-3).reverse();

    return NextResponse.json({
      summary,
      realization: validRealization,
      insights: {
        bestPerformers,
        worstPerformers,
        averageEfficiency:
          validRealization.reduce(
            (sum, r) => sum + r.performance.efficiency,
            0
          ) / validRealization.length,
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in budget realization:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
