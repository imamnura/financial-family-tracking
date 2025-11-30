import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/assets/value-tracking
 * Track asset values over time with historical data
 * Query params:
 * - assetId: string (optional, filter by specific asset)
 * - type: AssetType (optional, filter by asset type)
 * - startDate: ISO date (optional)
 * - endDate: ISO date (optional)
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const familyId = user.familyId!;

    // Build asset filter
    const assetFilter: any = { familyId };
    if (assetId) assetFilter.id = assetId;
    if (type) assetFilter.type = type;

    // Fetch assets with value history
    const assets = await prisma.asset.findMany({
      where: assetFilter,
      include: {
        valueHistory: {
          where: {
            ...(startDate && { date: { gte: new Date(startDate) } }),
            ...(endDate && { date: { lte: new Date(endDate) } }),
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate tracking data for each asset
    const trackingData = assets.map((asset) => {
      const currentValue = Number(asset.value);
      const purchasePrice = Number(asset.purchasePrice || asset.value);
      const valueChange = currentValue - purchasePrice;
      const valueChangePercentage = (valueChange / purchasePrice) * 100;

      // Calculate from value history
      const history = asset.valueHistory.map((h) => ({
        id: h.id,
        value: Number(h.value),
        date: h.date,
        notes: h.notes,
        source: h.source,
      }));

      // Calculate growth metrics
      let totalGrowth = 0;
      let annualizedReturn = 0;

      if (asset.acquisitionDate && history.length > 0) {
        const acquisitionDate = new Date(asset.acquisitionDate);
        const yearsSinceAcquisition =
          (new Date().getTime() - acquisitionDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365);

        totalGrowth = valueChangePercentage;
        annualizedReturn =
          yearsSinceAcquisition > 0
            ? Math.pow(
                currentValue / purchasePrice,
                1 / yearsSinceAcquisition
              ) *
                100 -
              100
            : 0;
      }

      // Calculate volatility (standard deviation of returns)
      let volatility = 0;
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
      }

      // Recent trend (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const recentHistory = history.filter(
        (h: any) => new Date(h.date) >= threeMonthsAgo
      );

      let recentTrend: "up" | "down" | "stable" = "stable";
      if (recentHistory.length >= 2) {
        const firstValue = recentHistory[0].value;
        const lastValue = recentHistory[recentHistory.length - 1].value;
        const change = ((lastValue - firstValue) / firstValue) * 100;
        if (change > 1) recentTrend = "up";
        else if (change < -1) recentTrend = "down";
      }

      // Performance rating
      let performanceRating: "excellent" | "good" | "average" | "poor";
      if (annualizedReturn > 15) performanceRating = "excellent";
      else if (annualizedReturn > 7) performanceRating = "good";
      else if (annualizedReturn > 0) performanceRating = "average";
      else performanceRating = "poor";

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        description: asset.description,
        acquisitionDate: asset.acquisitionDate,
        currentValue: {
          amount: currentValue,
          date: new Date(),
        },
        purchaseInfo: {
          price: purchasePrice,
          date: asset.acquisitionDate,
        },
        performance: {
          totalGrowth,
          totalGrowthAmount: valueChange,
          annualizedReturn,
          volatility,
          rating: performanceRating,
        },
        trend: {
          direction: recentTrend,
          period: "3 months",
          historyCount: history.length,
        },
        valueHistory: history,
      };
    });

    // Portfolio summary
    const totalCurrentValue = trackingData.reduce(
      (sum, t) => sum + t.currentValue.amount,
      0
    );
    const totalPurchaseValue = trackingData.reduce(
      (sum, t) => sum + t.purchaseInfo.price,
      0
    );
    const portfolioGrowth =
      totalPurchaseValue > 0
        ? ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100
        : 0;

    // Group by asset type
    const byType: Record<string, any> = {};
    trackingData.forEach((t) => {
      if (!byType[t.assetType]) {
        byType[t.assetType] = {
          count: 0,
          totalValue: 0,
          totalGrowth: 0,
        };
      }
      byType[t.assetType].count++;
      byType[t.assetType].totalValue += t.currentValue.amount;
      byType[t.assetType].totalGrowth += t.performance.totalGrowthAmount;
    });

    return NextResponse.json({
      summary: {
        totalAssets: trackingData.length,
        totalCurrentValue,
        totalPurchaseValue,
        portfolioGrowth,
        portfolioGrowthAmount: totalCurrentValue - totalPurchaseValue,
        byType,
      },
      assets: trackingData,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in asset value tracking:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/value-tracking
 * Add new value history entry for an asset
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { assetId, value, date, notes, source } = body;

    if (!assetId || value === undefined) {
      return NextResponse.json(
        { error: "assetId and value are required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;

    // Verify asset belongs to family
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, familyId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Create value history entry
    const valueHistory = await (prisma as any).assetValueHistory.create({
      data: {
        assetId,
        value: Number(value),
        date: date ? new Date(date) : new Date(),
        notes,
        source: source || "manual",
      },
    });

    // Update asset current value
    await prisma.asset.update({
      where: { id: assetId },
      data: { value: Number(value) },
    });

    return NextResponse.json({
      success: true,
      valueHistory,
      message: "Asset value updated successfully",
    });
  } catch (error: any) {
    console.error("Error adding value history:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
