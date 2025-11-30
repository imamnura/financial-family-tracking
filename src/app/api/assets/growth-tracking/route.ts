import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/assets/growth-tracking
 * Track asset growth with advanced analytics and predictions
 * Query params:
 * - assetId: string (optional, for specific asset)
 * - type: AssetType (optional)
 * - period: 1m | 3m | 6m | 1y | ytd | all (default: all)
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
    const assetId = searchParams.get("assetId");
    const type = searchParams.get("type");
    const period = searchParams.get("period") || "all";

    const familyId = user.familyId!;

    // Calculate date range based on period
    let startDate: Date | null = null;
    const endDate = new Date();

    switch (period) {
      case "1m":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "3m":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "6m":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "ytd":
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case "all":
      default:
        startDate = null;
        break;
    }

    // Build filter
    const assetFilter: any = { familyId };
    if (assetId) assetFilter.id = assetId;
    if (type) assetFilter.type = type;

    // Fetch assets with value history
    const assets = await prisma.asset.findMany({
      where: assetFilter,
      include: {
        valueHistory: {
          where: startDate ? { date: { gte: startDate } } : {},
          orderBy: { date: "asc" },
        },
      },
    });

    // Analyze growth for each asset
    const growthAnalysis = assets.map((asset) => {
      const purchasePrice = Number(asset.purchasePrice || asset.value);
      const currentValue = Number(asset.value);

      // Get value history
      const history = asset.valueHistory.map((h: any) => ({
        value: Number(h.value),
        date: new Date(h.date),
      }));

      // Calculate growth metrics
      const totalGrowth = currentValue - purchasePrice;
      const totalGrowthPercentage = (totalGrowth / purchasePrice) * 100;

      // Calculate period growth (if start date)
      let periodGrowth = 0;
      let periodGrowthPercentage = 0;
      let periodStartValue = purchasePrice;

      if (startDate && history.length > 0) {
        periodStartValue = history[0].value;
        periodGrowth = currentValue - periodStartValue;
        periodGrowthPercentage = (periodGrowth / periodStartValue) * 100;
      }

      // Calculate Compound Annual Growth Rate (CAGR)
      let cagr = 0;
      if (asset.acquisitionDate) {
        const years =
          (new Date().getTime() - new Date(asset.acquisitionDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365);
        if (years > 0) {
          cagr = (Math.pow(currentValue / purchasePrice, 1 / years) - 1) * 100;
        }
      }

      // Calculate volatility
      let volatility = 0;
      let sharpeRatio = 0;
      if (history.length > 1) {
        const returns = [];
        for (let i = 1; i < history.length; i++) {
          const returnVal =
            (history[i].value - history[i - 1].value) / history[i - 1].value;
          returns.push(returnVal);
        }

        const avgReturn =
          returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance =
          returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
          returns.length;
        volatility = Math.sqrt(variance) * 100;

        // Sharpe Ratio (assuming 3% risk-free rate)
        const riskFreeRate = 0.03;
        const excessReturn = avgReturn - riskFreeRate / 12; // Monthly
        sharpeRatio = volatility > 0 ? excessReturn / (volatility / 100) : 0;
      }

      // Growth trend analysis
      let trendDirection: "up" | "down" | "stable" = "stable";
      let trendStrength = 0;

      if (history.length >= 3) {
        // Simple Linear Regression
        const n = history.length;
        const xValues = history.map((_: any, i: number) => i);
        const yValues = history.map((h: any) => h.value);

        const sumX = xValues.reduce((sum: number, x: number) => sum + x, 0);
        const sumY = yValues.reduce((sum: number, y: number) => sum + y, 0);
        const sumXY = xValues.reduce(
          (sum: number, x: number, i: number) => sum + x * yValues[i],
          0
        );
        const sumX2 = xValues.reduce(
          (sum: number, x: number) => sum + x * x,
          0
        );

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const avgY = sumY / n;

        trendStrength = Math.abs((slope / avgY) * 100);

        if (slope > avgY * 0.01) trendDirection = "up";
        else if (slope < -avgY * 0.01) trendDirection = "down";
        else trendDirection = "stable";
      }

      // Performance benchmarking
      let performanceLevel:
        | "excellent"
        | "good"
        | "average"
        | "poor"
        | "declining";
      if (totalGrowthPercentage > 20) performanceLevel = "excellent";
      else if (totalGrowthPercentage > 10) performanceLevel = "good";
      else if (totalGrowthPercentage > 0) performanceLevel = "average";
      else if (totalGrowthPercentage > -10) performanceLevel = "poor";
      else performanceLevel = "declining";

      // Simple prediction (linear extrapolation for next 6 months)
      let predictedValue = currentValue;
      let predictedGrowth = 0;

      if (history.length >= 2) {
        const recentHistory = history.slice(-6); // Last 6 entries
        const monthlyGrowthRates = [];

        for (let i = 1; i < recentHistory.length; i++) {
          const rate =
            (recentHistory[i].value - recentHistory[i - 1].value) /
            recentHistory[i - 1].value;
          monthlyGrowthRates.push(rate);
        }

        const avgMonthlyGrowth =
          monthlyGrowthRates.reduce((sum, r) => sum + r, 0) /
          monthlyGrowthRates.length;

        predictedValue = currentValue * Math.pow(1 + avgMonthlyGrowth, 6);
        predictedGrowth =
          ((predictedValue - currentValue) / currentValue) * 100;
      }

      // Monthly growth breakdown
      const monthlyGrowth: Record<string, number> = {};
      history.forEach((h: any, i: number) => {
        if (i > 0) {
          const monthKey = h.date.toLocaleDateString("id-ID", {
            month: "short",
            year: "numeric",
          });
          monthlyGrowth[monthKey] =
            ((h.value - history[i - 1].value) / history[i - 1].value) * 100;
        }
      });

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        currentValue,
        purchasePrice,
        growth: {
          total: {
            amount: totalGrowth,
            percentage: totalGrowthPercentage,
          },
          period: {
            amount: periodGrowth,
            percentage: periodGrowthPercentage,
            periodLabel: period,
          },
          cagr,
        },
        risk: {
          volatility,
          sharpeRatio,
          riskLevel:
            volatility < 5
              ? "low"
              : volatility < 15
              ? "medium"
              : volatility < 30
              ? "high"
              : "very_high",
        },
        trend: {
          direction: trendDirection,
          strength: trendStrength,
          description:
            trendDirection === "up"
              ? `Growing at ${trendStrength.toFixed(1)}% rate`
              : trendDirection === "down"
              ? `Declining at ${trendStrength.toFixed(1)}% rate`
              : "Stable with minimal fluctuation",
        },
        performance: {
          level: performanceLevel,
          score:
            performanceLevel === "excellent"
              ? 90
              : performanceLevel === "good"
              ? 75
              : performanceLevel === "average"
              ? 60
              : performanceLevel === "poor"
              ? 40
              : 20,
        },
        prediction: {
          next6Months: {
            estimatedValue: predictedValue,
            estimatedGrowth: predictedGrowth,
            confidence: history.length >= 6 ? "medium" : "low",
          },
        },
        valueHistory: history,
        monthlyGrowth,
      };
    });

    // Portfolio-level analytics
    const totalCurrentValue = growthAnalysis.reduce(
      (sum, a) => sum + a.currentValue,
      0
    );
    const totalPurchaseValue = growthAnalysis.reduce(
      (sum, a) => sum + a.purchasePrice,
      0
    );
    const portfolioGrowth = totalCurrentValue - totalPurchaseValue;
    const portfolioGrowthPercentage =
      (portfolioGrowth / totalPurchaseValue) * 100;

    // Calculate portfolio CAGR
    const oldestAcquisition = assets.reduce((oldest, asset) => {
      if (!asset.acquisitionDate) return oldest;
      const date = new Date(asset.acquisitionDate);
      return !oldest || date < oldest ? date : oldest;
    }, null as Date | null);

    let portfolioCagr = 0;
    if (oldestAcquisition) {
      const years =
        (new Date().getTime() - oldestAcquisition.getTime()) /
        (1000 * 60 * 60 * 24 * 365);
      if (years > 0) {
        portfolioCagr =
          (Math.pow(totalCurrentValue / totalPurchaseValue, 1 / years) - 1) *
          100;
      }
    }

    // Asset allocation
    const allocationByType: Record<string, any> = {};
    growthAnalysis.forEach((a) => {
      if (!allocationByType[a.assetType]) {
        allocationByType[a.assetType] = {
          count: 0,
          totalValue: 0,
          totalGrowth: 0,
          percentage: 0,
        };
      }
      allocationByType[a.assetType].count++;
      allocationByType[a.assetType].totalValue += a.currentValue;
      allocationByType[a.assetType].totalGrowth += a.growth.total.amount;
    });

    Object.keys(allocationByType).forEach((type) => {
      allocationByType[type].percentage =
        (allocationByType[type].totalValue / totalCurrentValue) * 100;
    });

    // Top performers
    const sortedByGrowth = [...growthAnalysis].sort(
      (a, b) => b.growth.total.percentage - a.growth.total.percentage
    );

    return NextResponse.json({
      period: {
        label: period,
        startDate: startDate || "All time",
        endDate,
      },
      portfolioSummary: {
        totalAssets: growthAnalysis.length,
        totalCurrentValue,
        totalPurchaseValue,
        totalGrowth: portfolioGrowth,
        totalGrowthPercentage: portfolioGrowthPercentage,
        cagr: portfolioCagr,
        allocationByType,
      },
      assets: growthAnalysis,
      topPerformers: sortedByGrowth.slice(0, 5),
      bottomPerformers: sortedByGrowth.slice(-5).reverse(),
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in growth tracking:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
