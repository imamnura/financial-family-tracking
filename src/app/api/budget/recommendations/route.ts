import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { getMonthInt, getMonthDateRange } from "@/lib/date-helpers";

/**
 * GET /api/budget/recommendations
 * Generate budget recommendations based on historical data
 * Query params:
 * - monthsToAnalyze: number (default: 6)
 * - targetYear: number
 * - targetMonth: number
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
    const monthsToAnalyze = parseInt(
      searchParams.get("monthsToAnalyze") || "6"
    );
    const targetYear = parseInt(
      searchParams.get("targetYear") || new Date().getFullYear().toString()
    );
    const targetMonth = parseInt(
      searchParams.get("targetMonth") || (new Date().getMonth() + 2).toString()
    );

    const familyId = user.familyId!;

    // Calculate analysis period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsToAnalyze);

    // Get all categories with transactions
    const categories = await prisma.category.findMany({
      where: {
        familyId: familyId,
        type: "EXPENSE",
      },
    });

    // Analyze spending for each category
    const categoryAnalysis = await Promise.all(
      categories.map(async (category) => {
        // Get historical transactions
        const transactions = await prisma.transaction.findMany({
          where: {
            familyId,
            categoryId: category.id,
            type: "EXPENSE",
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: "asc" },
        });

        if (transactions.length === 0) return null;

        const amounts = transactions.map((t) => Number(t.amount));
        const total = amounts.reduce((sum, amt) => sum + amt, 0);
        const average = total / monthsToAnalyze;
        const median =
          amounts.sort((a, b) => a - b)[Math.floor(amounts.length / 2)] || 0;

        // Calculate standard deviation
        const variance =
          amounts.reduce((sum, amt) => sum + Math.pow(amt - average, 2), 0) /
          amounts.length;
        const stdDev = Math.sqrt(variance);

        // Calculate trend
        const halfPoint = Math.floor(transactions.length / 2);
        const firstHalfAvg =
          transactions
            .slice(0, halfPoint)
            .reduce((sum, tx) => sum + Number(tx.amount), 0) / halfPoint;
        const secondHalfAvg =
          transactions
            .slice(halfPoint)
            .reduce((sum, tx) => sum + Number(tx.amount), 0) /
          (transactions.length - halfPoint);
        const trendPercentage =
          ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
        const trend =
          trendPercentage > 10
            ? "increasing"
            : trendPercentage < -10
            ? "decreasing"
            : "stable";

        // Calculate recommended budget
        let recommendedBudget = average;

        // Adjust based on trend
        if (trend === "increasing") {
          recommendedBudget = average + stdDev * 0.5; // Add buffer for increasing trend
        } else if (trend === "decreasing") {
          recommendedBudget = average - stdDev * 0.3; // Reduce for decreasing trend
        } else {
          recommendedBudget = average + stdDev * 0.2; // Small buffer for stable
        }

        // Round to nearest 1000
        recommendedBudget = Math.ceil(recommendedBudget / 1000) * 1000;

        // Calculate confidence level
        const coefficientOfVariation = (stdDev / average) * 100;
        let confidence: "high" | "medium" | "low";
        if (coefficientOfVariation < 20) confidence = "high";
        else if (coefficientOfVariation < 40) confidence = "medium";
        else confidence = "low";

        // Get current budget if exists
        const targetMonthInt = getMonthInt(
          new Date(targetYear, targetMonth - 1, 1)
        );
        const currentBudget = await prisma.budget.findFirst({
          where: {
            familyId,
            categoryId: category.id,
            year: targetYear,
            month: targetMonthInt,
          },
        });

        return {
          categoryId: category.id,
          categoryName: category.name,
          analysis: {
            monthsAnalyzed: monthsToAnalyze,
            transactionCount: transactions.length,
            averageMonthlySpending: average,
            medianMonthlySpending: median,
            standardDeviation: stdDev,
            trend,
            trendPercentage,
            volatility: coefficientOfVariation,
          },
          recommendation: {
            suggestedBudget: recommendedBudget,
            confidence,
            reasoning: `Based on ${monthsToAnalyze} months of data with ${trend} trend. ${
              trend === "increasing"
                ? "Added buffer due to increasing spending."
                : trend === "decreasing"
                ? "Reduced budget due to decreasing spending."
                : "Stable spending pattern with small buffer."
            }`,
            minBudget: Math.ceil((average - stdDev) / 1000) * 1000,
            maxBudget: Math.ceil((average + stdDev * 1.5) / 1000) * 1000,
          },
          currentBudget: currentBudget
            ? {
                amount: Number(currentBudget.amount),
                difference: Number(currentBudget.amount) - recommendedBudget,
                differencePercentage:
                  ((Number(currentBudget.amount) - recommendedBudget) /
                    recommendedBudget) *
                  100,
              }
            : null,
        };
      })
    );

    // Filter out null and sort by spending
    const validAnalysis = categoryAnalysis
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .sort(
        (a, b) =>
          b.analysis.averageMonthlySpending - a.analysis.averageMonthlySpending
      );

    // Calculate total recommended budget
    const totalRecommended = validAnalysis.reduce(
      (sum, a) => sum + a.recommendation.suggestedBudget,
      0
    );

    // Get user's income for reference
    const recentIncome = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "INCOME",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const avgMonthlyIncome =
      Number(recentIncome._sum?.amount || 0) / monthsToAnalyze;

    // Overall recommendations
    const overallRecommendations = [];

    // Check if total budget is reasonable
    const budgetToIncomeRatio = (totalRecommended / avgMonthlyIncome) * 100;
    if (budgetToIncomeRatio > 80) {
      overallRecommendations.push({
        type: "warning",
        title: "Budget terlalu tinggi",
        description: `Total budget yang direkomendasikan (${budgetToIncomeRatio.toFixed(
          0
        )}% dari income) terlalu tinggi. Pertimbangkan untuk mengurangi di kategori non-essential.`,
        priority: "high",
      });
    } else if (budgetToIncomeRatio < 50) {
      overallRecommendations.push({
        type: "opportunity",
        title: "Peluang menabung lebih banyak",
        description: `Budget hanya ${budgetToIncomeRatio.toFixed(
          0
        )}% dari income. Anda bisa menabung ${(
          100 - budgetToIncomeRatio
        ).toFixed(0)}% dari income.`,
        priority: "medium",
      });
    }

    // Check for high volatility categories
    const highVolatilityCategories = validAnalysis.filter(
      (a) => a.analysis.volatility > 40
    );
    if (highVolatilityCategories.length > 0) {
      overallRecommendations.push({
        type: "info",
        title: "Kategori dengan spending tidak stabil",
        description: `${
          highVolatilityCategories.length
        } kategori memiliki pola pengeluaran yang tidak stabil. Monitor lebih ketat: ${highVolatilityCategories
          .slice(0, 3)
          .map((c) => c.categoryName)
          .join(", ")}`,
        priority: "low",
      });
    }

    // Check for increasing trends
    const increasingCategories = validAnalysis.filter(
      (a) => a.analysis.trend === "increasing"
    );
    if (increasingCategories.length > 0) {
      overallRecommendations.push({
        type: "warning",
        title: "Pengeluaran meningkat",
        description: `${
          increasingCategories.length
        } kategori menunjukkan tren pengeluaran meningkat. Review: ${increasingCategories
          .slice(0, 3)
          .map((c) => c.categoryName)
          .join(", ")}`,
        priority: "high",
      });
    }

    return NextResponse.json({
      targetPeriod: {
        year: targetYear,
        month: targetMonth,
        monthName: new Date(targetYear, targetMonth - 1, 1).toLocaleDateString(
          "id-ID",
          { month: "long", year: "numeric" }
        ),
      },
      analysis: {
        monthsAnalyzed: monthsToAnalyze,
        categoriesAnalyzed: validAnalysis.length,
        averageMonthlyIncome: avgMonthlyIncome,
      },
      recommendations: validAnalysis,
      summary: {
        totalRecommendedBudget: totalRecommended,
        averageMonthlyIncome: avgMonthlyIncome,
        budgetToIncomeRatio,
        recommendedSavingsRate: 100 - budgetToIncomeRatio,
      },
      overallRecommendations,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in budget recommendations:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
