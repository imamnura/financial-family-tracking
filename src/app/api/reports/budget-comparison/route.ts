import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import {
  getMonthInt,
  monthIntToDate,
  getMonthDateRange,
} from "@/lib/date-helpers";

/**
 * GET /api/reports/budget-comparison
 * Detailed budget vs actual spending comparison with variance analysis
 * Query params:
 * - year: number
 * - month: number (optional, if not provided shows all months)
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
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : null;
    const categoryId = searchParams.get("categoryId");

    let budgets;
    let startDate: Date;
    let endDate: Date;

    if (month) {
      // Single month analysis
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      const monthInt = getMonthInt(startDate);

      budgets = await prisma.budget.findMany({
        where: {
          familyId: user.familyId!,
          month: monthInt,
          year: year,
          ...(categoryId && { categoryId }),
        },
        include: {
          category: true,
        },
      });
    } else {
      // Full year analysis
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
      const startMonthInt = getMonthInt(startDate);
      const endMonthInt = getMonthInt(endDate);

      budgets = await prisma.budget.findMany({
        where: {
          familyId: user.familyId!,
          year: year,
          month: {
            gte: startMonthInt,
            lte: endMonthInt,
          },
          ...(categoryId && { categoryId }),
        },
        include: {
          category: true,
        },
        orderBy: { month: "asc" },
      });
    }

    // Analyze each budget
    const comparisons = await Promise.all(
      budgets.map(async (budget) => {
        if (!budget.month) return null;

        const { start: budgetStartDate, end: budgetEndDate } =
          getMonthDateRange(budget.month);

        // Get actual spending
        const spending = await prisma.transaction.aggregate({
          where: {
            familyId: user.familyId!,
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: { gte: budgetStartDate, lte: budgetEndDate },
          },
          _sum: { amount: true },
          _count: true,
        });

        // Get transaction details
        const transactions = await prisma.transaction.findMany({
          where: {
            familyId: user.familyId!,
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: { gte: budgetStartDate, lte: budgetEndDate },
          },
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
          },
          orderBy: { amount: "desc" },
          take: 5,
        });

        const budgetAmount = Number(budget.amount);
        const actualAmount = Number(spending._sum?.amount || 0);
        const variance = actualAmount - budgetAmount;
        const variancePercentage = (variance / budgetAmount) * 100;
        const utilizationRate = (actualAmount / budgetAmount) * 100;

        // Calculate trend (compare with previous month if exists)
        let trend: "up" | "down" | "stable" = "stable";
        let trendPercentage = 0;

        if (budget.month && budget.year) {
          const budgetMonthDate = monthIntToDate(budget.month);
          const previousMonthDate = new Date(budgetMonthDate);
          previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
          const prevMonthInt = getMonthInt(previousMonthDate);
          const prevYear = previousMonthDate.getFullYear();

          const previousBudget = await prisma.budget.findFirst({
            where: {
              familyId: user.familyId!,
              categoryId: budget.categoryId,
              month: prevMonthInt,
              year: prevYear,
            },
          });

          if (previousBudget) {
            const { start: prevMonthStart, end: prevMonthEnd } =
              getMonthDateRange(prevMonthInt);

            const previousSpending = await prisma.transaction.aggregate({
              where: {
                familyId: user.familyId!,
                categoryId: budget.categoryId,
                type: "EXPENSE",
                date: { gte: prevMonthStart, lte: prevMonthEnd },
              },
              _sum: { amount: true },
            });

            const prevAmount = Number(previousSpending._sum?.amount || 0);
            if (prevAmount > 0) {
              trendPercentage =
                ((actualAmount - prevAmount) / prevAmount) * 100;
              if (trendPercentage > 5) trend = "up";
              else if (trendPercentage < -5) trend = "down";
            }
          }
        }

        // Determine status
        let status: "excellent" | "good" | "warning" | "over" | "critical";
        if (utilizationRate <= 70) status = "excellent";
        else if (utilizationRate <= 90) status = "good";
        else if (utilizationRate <= 100) status = "warning";
        else if (utilizationRate <= 120) status = "over";
        else status = "critical";

        // Calculate daily average
        const budgetMonthDate = budget.month
          ? monthIntToDate(budget.month)
          : new Date();
        const daysInMonth = new Date(
          budgetMonthDate.getFullYear(),
          budgetMonthDate.getMonth() + 1,
          0
        ).getDate();
        const dailyBudget = budgetAmount / daysInMonth;
        const dailyActual = actualAmount / daysInMonth;

        return {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category?.name || "Uncategorized",
          month: budgetMonthDate.toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
          }),
          budget: budgetAmount,
          actual: actualAmount,
          variance,
          variancePercentage,
          utilizationRate,
          status,
          trend,
          trendPercentage,
          dailyBudget,
          dailyActual,
          transactionCount: spending._count,
          topTransactions: transactions,
        };
      })
    );

    // Filter out null comparisons and calculate overall statistics
    const validComparisons = comparisons.filter(
      (c): c is NonNullable<typeof c> => c !== null
    );
    const totalBudget = validComparisons.reduce((sum, c) => sum + c.budget, 0);
    const totalActual = validComparisons.reduce((sum, c) => sum + c.actual, 0);
    const totalVariance = totalActual - totalBudget;
    const overallUtilization =
      totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    const statusCounts = {
      excellent: validComparisons.filter((c) => c.status === "excellent")
        .length,
      good: validComparisons.filter((c) => c.status === "good").length,
      warning: validComparisons.filter((c) => c.status === "warning").length,
      over: validComparisons.filter((c) => c.status === "over").length,
      critical: validComparisons.filter((c) => c.status === "critical").length,
    };

    // Get categories that are over budget
    const overBudgetCategories = validComparisons
      .filter((c) => c.variance > 0)
      .sort((a, b) => b.variancePercentage - a.variancePercentage);

    // Get categories under budget (potential savings)
    const underBudgetCategories = validComparisons
      .filter((c) => c.variance < 0)
      .sort((a, b) => a.variancePercentage - b.variancePercentage);

    // Calculate forecast (if current month)
    let forecast = null;
    if (month) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (year === currentYear && month === currentMonth) {
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(year, month, 0).getDate();
        const daysRemaining = daysInMonth - dayOfMonth;

        const dailyAvgSpending = totalActual / dayOfMonth;
        const projectedTotal = dailyAvgSpending * daysInMonth;
        const projectedVariance = projectedTotal - totalBudget;

        forecast = {
          daysElapsed: dayOfMonth,
          daysRemaining,
          currentSpending: totalActual,
          dailyAverage: dailyAvgSpending,
          projectedTotal,
          projectedVariance,
          projectedUtilization: (projectedTotal / totalBudget) * 100,
          onTrack: projectedTotal <= totalBudget,
        };
      }
    }

    return NextResponse.json({
      period: {
        year,
        month,
        startDate,
        endDate,
      },
      summary: {
        totalBudget,
        totalActual,
        totalVariance,
        overallUtilization,
        categoriesAnalyzed: comparisons.length,
        statusCounts,
      },
      comparisons: validComparisons.sort(
        (a, b) => b.variancePercentage - a.variancePercentage
      ),
      insights: {
        overBudget: overBudgetCategories,
        underBudget: underBudgetCategories,
        highestVariance: validComparisons.sort(
          (a, b) => Math.abs(b.variance) - Math.abs(a.variance)
        )[0],
        mostEfficient: validComparisons
          .filter((c) => c.utilizationRate <= 100)
          .sort((a, b) => a.utilizationRate - b.utilizationRate)[0],
      },
      forecast,
    });
  } catch (error) {
    console.error("[Budget Comparison] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get comparison",
      },
      { status: 500 }
    );
  }
}
