import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { getMonthInt, getMonthDateRange } from "@/lib/date-helpers";

/**
 * GET /api/budget/smart-suggestions
 * AI-powered smart budget suggestions with ML predictions
 * Query params:
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
    const targetYear = parseInt(
      searchParams.get("targetYear") || new Date().getFullYear().toString()
    );
    const targetMonth = parseInt(
      searchParams.get("targetMonth") || (new Date().getMonth() + 2).toString()
    );

    const familyId = user.familyId!;

    // Get 12 months of historical data for ML
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    // Get all expense categories
    const categories = await prisma.category.findMany({
      where: {
        familyId: familyId,
        type: "EXPENSE",
      },
    });

    // Advanced ML-based analysis for each category
    const smartSuggestions = await Promise.all(
      categories.map(async (category) => {
        // Get monthly spending data
        const monthlyData = [];
        for (let i = 0; i < 12; i++) {
          const monthDate = new Date(endDate);
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthInt = getMonthInt(monthDate);
          const { start, end } = getMonthDateRange(monthInt);

          const transactions = await prisma.transaction.aggregate({
            where: {
              familyId,
              categoryId: category.id,
              type: "EXPENSE",
              date: { gte: start, lte: end },
            },
            _sum: { amount: true },
            _count: true,
          });

          monthlyData.unshift({
            month: i,
            amount: Number(transactions._sum?.amount || 0),
            count: transactions._count,
          });
        }

        // Skip if no data
        if (monthlyData.every((m) => m.amount === 0)) return null;

        // Simple Linear Regression for trend prediction
        const n = monthlyData.length;
        const sumX = monthlyData.reduce((sum, d, i) => sum + i, 0);
        const sumY = monthlyData.reduce((sum, d) => sum + d.amount, 0);
        const sumXY = monthlyData.reduce((sum, d, i) => sum + i * d.amount, 0);
        const sumX2 = monthlyData.reduce((sum, d, i) => sum + i * i, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Predict next month (month 12)
        const linearPrediction = slope * 12 + intercept;

        // Exponential Moving Average (EMA) for smoothing
        const alpha = 0.3; // Smoothing factor
        let ema = monthlyData[0].amount;
        for (let i = 1; i < monthlyData.length; i++) {
          ema = alpha * monthlyData[i].amount + (1 - alpha) * ema;
        }

        // Weighted average (recent months have more weight)
        const weights = [
          1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2,
        ];
        const weightedSum = monthlyData.reduce(
          (sum, d, i) => sum + d.amount * weights[i],
          0
        );
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const weightedAverage = weightedSum / totalWeight;

        // Ensemble prediction (combine all methods)
        const ensemblePrediction =
          linearPrediction * 0.3 + ema * 0.3 + weightedAverage * 0.4;

        // Calculate seasonality index
        const avgAmount = sumY / n;
        const seasonalityFactors = monthlyData.map((d) =>
          avgAmount > 0 ? d.amount / avgAmount : 1
        );
        const targetMonthIndex = (targetMonth - 1) % 12;
        const seasonalityAdjustment = seasonalityFactors[targetMonthIndex] || 1;

        // Final prediction with seasonality
        const finalPrediction = ensemblePrediction * seasonalityAdjustment;

        // Calculate confidence based on data consistency
        const amounts = monthlyData.map((d) => d.amount);
        const mean = avgAmount;
        const variance =
          amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 100;

        let confidence: "very_high" | "high" | "medium" | "low";
        if (coefficientOfVariation < 15) confidence = "very_high";
        else if (coefficientOfVariation < 30) confidence = "high";
        else if (coefficientOfVariation < 50) confidence = "medium";
        else confidence = "low";

        // Smart budget calculation with multiple strategies
        const strategies = {
          conservative:
            Math.ceil((finalPrediction + stdDev * 1.5) / 1000) * 1000,
          moderate: Math.ceil((finalPrediction + stdDev * 0.5) / 1000) * 1000,
          aggressive: Math.ceil((finalPrediction - stdDev * 0.3) / 1000) * 1000,
          aiOptimized: Math.ceil(finalPrediction / 1000) * 1000,
        };

        // Detect spending patterns
        const patterns = [];

        // Check for consistent growth
        if (slope > 0 && slope / avgAmount > 0.05) {
          patterns.push({
            type: "growth",
            description: "Pengeluaran konsisten meningkat",
            impact: "high",
          });
        }

        // Check for volatility
        if (coefficientOfVariation > 40) {
          patterns.push({
            type: "volatile",
            description: "Pengeluaran sangat tidak stabil",
            impact: "medium",
          });
        }

        // Check for seasonality
        const maxSeasonal = Math.max(...seasonalityFactors);
        const minSeasonal = Math.min(...seasonalityFactors);
        if (maxSeasonal / minSeasonal > 1.5) {
          patterns.push({
            type: "seasonal",
            description: "Pengeluaran memiliki pola musiman",
            impact: "medium",
          });
        }

        // Generate AI insights
        const insights = [];

        if (confidence === "very_high" || confidence === "high") {
          insights.push({
            type: "recommendation",
            message: `Budget ${category.name} sangat predictable. Gunakan strategi AI-Optimized.`,
            action: "use_ai_optimized",
          });
        }

        if (slope > 0) {
          insights.push({
            type: "warning",
            message: `Pengeluaran ${category.name} meningkat ${(
              (slope / avgAmount) *
              100
            ).toFixed(1)}% per bulan.`,
            action: "review_spending",
          });
        }

        if (patterns.some((p) => p.type === "volatile")) {
          insights.push({
            type: "alert",
            message: `${category.name} memiliki spending tidak stabil. Gunakan strategi Conservative.`,
            action: "use_conservative",
          });
        }

        return {
          categoryId: category.id,
          categoryName: category.name,
          prediction: {
            amount: finalPrediction,
            confidence,
            methods: {
              linearRegression: linearPrediction,
              exponentialMovingAverage: ema,
              weightedAverage: weightedAverage,
              ensemble: ensemblePrediction,
            },
            seasonalityFactor: seasonalityAdjustment,
          },
          budgetStrategies: strategies,
          recommendedStrategy:
            confidence === "very_high" || confidence === "high"
              ? "aiOptimized"
              : coefficientOfVariation > 40
              ? "conservative"
              : "moderate",
          analysis: {
            monthsAnalyzed: 12,
            averageMonthly: avgAmount,
            standardDeviation: stdDev,
            volatility: coefficientOfVariation,
            trend:
              slope > 0 ? "increasing" : slope < 0 ? "decreasing" : "stable",
            trendRate: (slope / avgAmount) * 100,
          },
          patterns,
          insights,
        };
      })
    );

    // Filter valid suggestions
    const validSuggestions = smartSuggestions.filter(
      (s): s is NonNullable<typeof s> => s !== null
    );

    // Calculate portfolio-level metrics
    const totalPredicted = validSuggestions.reduce(
      (sum, s) => sum + s.prediction.amount,
      0
    );

    const strategyTotals = {
      conservative: validSuggestions.reduce(
        (sum, s) => sum + s.budgetStrategies.conservative,
        0
      ),
      moderate: validSuggestions.reduce(
        (sum, s) => sum + s.budgetStrategies.moderate,
        0
      ),
      aggressive: validSuggestions.reduce(
        (sum, s) => sum + s.budgetStrategies.aggressive,
        0
      ),
      aiOptimized: validSuggestions.reduce(
        (sum, s) => sum + s.budgetStrategies.aiOptimized,
        0
      ),
    };

    // Get income projection
    const incomeData = await prisma.transaction.aggregate({
      where: {
        familyId,
        type: "INCOME",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const avgMonthlyIncome = Number(incomeData._sum?.amount || 0) / 12;

    // Portfolio-level recommendations
    const portfolioRecommendations = [];

    const aiOptimizedRatio =
      (strategyTotals.aiOptimized / avgMonthlyIncome) * 100;

    if (aiOptimizedRatio < 60) {
      portfolioRecommendations.push({
        type: "opportunity",
        priority: "high",
        title: "Peluang savings tinggi",
        description: `AI prediction menunjukkan Anda hanya perlu ${aiOptimizedRatio.toFixed(
          0
        )}% dari income untuk expenses. Sisanya bisa ditabung atau diinvestasikan.`,
        potentialSavings: avgMonthlyIncome - strategyTotals.aiOptimized,
      });
    }

    const highConfidenceCount = validSuggestions.filter(
      (s) =>
        s.prediction.confidence === "very_high" ||
        s.prediction.confidence === "high"
    ).length;

    portfolioRecommendations.push({
      type: "info",
      priority: "medium",
      title: "AI Confidence Level",
      description: `${highConfidenceCount} dari ${validSuggestions.length} kategori memiliki confidence tinggi untuk AI prediction.`,
    });

    return NextResponse.json({
      targetPeriod: {
        year: targetYear,
        month: targetMonth,
        monthName: new Date(targetYear, targetMonth - 1, 1).toLocaleDateString(
          "id-ID",
          { month: "long", year: "numeric" }
        ),
      },
      suggestions: validSuggestions,
      portfolioAnalysis: {
        totalPredictedSpending: totalPredicted,
        averageMonthlyIncome: avgMonthlyIncome,
        strategyComparison: {
          conservative: {
            total: strategyTotals.conservative,
            savingsRate:
              ((avgMonthlyIncome - strategyTotals.conservative) /
                avgMonthlyIncome) *
              100,
          },
          moderate: {
            total: strategyTotals.moderate,
            savingsRate:
              ((avgMonthlyIncome - strategyTotals.moderate) /
                avgMonthlyIncome) *
              100,
          },
          aggressive: {
            total: strategyTotals.aggressive,
            savingsRate:
              ((avgMonthlyIncome - strategyTotals.aggressive) /
                avgMonthlyIncome) *
              100,
          },
          aiOptimized: {
            total: strategyTotals.aiOptimized,
            savingsRate:
              ((avgMonthlyIncome - strategyTotals.aiOptimized) /
                avgMonthlyIncome) *
              100,
          },
        },
        recommendedStrategy: aiOptimizedRatio < 70 ? "aiOptimized" : "moderate",
      },
      portfolioRecommendations,
      metadata: {
        algorithm: "Ensemble ML (Linear Regression + EMA + Weighted Average)",
        dataPoints: 12,
        confidenceMetrics: {
          veryHigh: validSuggestions.filter(
            (s) => s.prediction.confidence === "very_high"
          ).length,
          high: validSuggestions.filter(
            (s) => s.prediction.confidence === "high"
          ).length,
          medium: validSuggestions.filter(
            (s) => s.prediction.confidence === "medium"
          ).length,
          low: validSuggestions.filter((s) => s.prediction.confidence === "low")
            .length,
        },
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in smart suggestions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
