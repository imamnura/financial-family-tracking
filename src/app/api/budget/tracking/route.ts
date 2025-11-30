import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { getMonthInt, getMonthDateRange } from "@/lib/date-helpers";

/**
 * GET /api/budget/tracking
 * Real-time budget tracking with alerts
 * Query params:
 * - year: number
 * - month: number (optional, if not provided returns all budgets for the year)
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
    const month = monthParam ? parseInt(monthParam) : null;

    const familyId = user.familyId!;

    // Build query filter
    const budgetFilter: any = {
      familyId,
      year,
    };

    if (month) {
      const monthInt = getMonthInt(new Date(year, month - 1, 1));
      budgetFilter.month = monthInt;
    }

    // Fetch budgets with category info
    const budgets = await prisma.budget.findMany({
      where: budgetFilter,
      include: {
        category: true,
      },
      orderBy: [{ month: "asc" }],
    });

    // Calculate tracking data for each budget
    const trackingData = await Promise.all(
      budgets.map(async (budget) => {
        if (!budget.month || !budget.year) return null;

        const { start, end } = getMonthDateRange(budget.month);

        // Get actual spending for this budget period
        const transactions = await prisma.transaction.aggregate({
          where: {
            familyId,
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: {
              gte: start,
              lte: end,
            },
          },
          _sum: { amount: true },
          _count: true,
        });

        const actualSpent = Number(transactions._sum?.amount || 0);
        const budgetAmount = Number(budget.amount);
        const remaining = budgetAmount - actualSpent;
        const utilizationRate = (actualSpent / budgetAmount) * 100;

        // Calculate daily burn rate
        const daysInMonth = new Date(
          budget.year,
          budget.month % 100,
          0
        ).getDate();
        const currentDay = new Date().getDate();
        const daysElapsed = Math.min(currentDay, daysInMonth);
        const dailyBurnRate = daysElapsed > 0 ? actualSpent / daysElapsed : 0;
        const projectedSpending = dailyBurnRate * daysInMonth;

        // Determine alert level
        let alertLevel: "none" | "info" | "warning" | "danger" | "critical" =
          "none";
        let alertMessage = "";

        if (utilizationRate >= 150) {
          alertLevel = "critical";
          alertMessage = `CRITICAL: Budget exceeded by ${(
            utilizationRate - 100
          ).toFixed(0)}%!`;
        } else if (utilizationRate >= 100) {
          alertLevel = "danger";
          alertMessage = `DANGER: Budget exceeded by ${(
            utilizationRate - 100
          ).toFixed(0)}%`;
        } else if (utilizationRate >= 90) {
          alertLevel = "warning";
          alertMessage = `WARNING: ${(100 - utilizationRate).toFixed(
            0
          )}% budget remaining`;
        } else if (utilizationRate >= 75) {
          alertLevel = "info";
          alertMessage = `INFO: ${utilizationRate.toFixed(0)}% budget used`;
        }

        // Check if on track for the month
        const expectedUtilization = (daysElapsed / daysInMonth) * 100;
        const isOnTrack = utilizationRate <= expectedUtilization * 1.1; // 10% tolerance

        // Forecast end-of-month status
        const projectedUtilization = (projectedSpending / budgetAmount) * 100;
        const forecastStatus =
          projectedUtilization > 100
            ? "over"
            : projectedUtilization > 90
            ? "warning"
            : "good";

        return {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category?.name || "Uncategorized",
          period: {
            year: budget.year,
            month: budget.month,
            startDate: start,
            endDate: end,
          },
          budget: {
            amount: budgetAmount,
            spent: actualSpent,
            remaining,
            utilizationRate,
          },
          metrics: {
            transactionCount: transactions._count,
            dailyBurnRate,
            daysElapsed,
            daysRemaining: daysInMonth - daysElapsed,
            projectedSpending,
            projectedUtilization,
          },
          status: {
            isOnTrack,
            expectedUtilization,
            variance: utilizationRate - expectedUtilization,
            forecastStatus,
          },
          alert: {
            level: alertLevel,
            message: alertMessage,
            timestamp: new Date(),
          },
        };
      })
    );

    // Filter out null entries
    const validTracking = trackingData.filter(
      (t): t is NonNullable<typeof t> => t !== null
    );

    // Generate summary
    const summary = {
      totalBudgets: validTracking.length,
      totalBudgetAmount: validTracking.reduce(
        (sum, t) => sum + t.budget.amount,
        0
      ),
      totalSpent: validTracking.reduce((sum, t) => sum + t.budget.spent, 0),
      totalRemaining: validTracking.reduce(
        (sum, t) => sum + t.budget.remaining,
        0
      ),
      averageUtilization:
        validTracking.length > 0
          ? validTracking.reduce(
              (sum, t) => sum + t.budget.utilizationRate,
              0
            ) / validTracking.length
          : 0,
      alerts: {
        critical: validTracking.filter((t) => t.alert.level === "critical")
          .length,
        danger: validTracking.filter((t) => t.alert.level === "danger").length,
        warning: validTracking.filter((t) => t.alert.level === "warning")
          .length,
        info: validTracking.filter((t) => t.alert.level === "info").length,
      },
      onTrackCount: validTracking.filter((t) => t.status.isOnTrack).length,
      offTrackCount: validTracking.filter((t) => !t.status.isOnTrack).length,
    };

    // Get critical alerts for notifications
    const criticalAlerts = validTracking
      .filter((t) => t.alert.level === "critical" || t.alert.level === "danger")
      .map((t) => ({
        categoryName: t.categoryName,
        message: t.alert.message,
        utilizationRate: t.budget.utilizationRate,
        spent: t.budget.spent,
        budget: t.budget.amount,
      }));

    return NextResponse.json({
      summary,
      tracking: validTracking,
      criticalAlerts,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in budget tracking:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
