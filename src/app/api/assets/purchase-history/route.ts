import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/assets/purchase-history
 * Get comprehensive purchase history and acquisition details
 * Query params:
 * - year: number (optional, filter by acquisition year)
 * - type: AssetType (optional)
 * - sortBy: acquisitionDate | value | name (default: acquisitionDate)
 * - sortOrder: asc | desc (default: desc)
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
    const year = searchParams.get("year");
    const type = searchParams.get("type");
    const sortBy = searchParams.get("sortBy") || "acquisitionDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const familyId = user.familyId!;

    // Build filter
    const filter: any = { familyId };
    if (type) filter.type = type;
    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      filter.acquisitionDate = { gte: startDate, lte: endDate };
    }

    // Fetch assets
    const assets = (await prisma.asset.findMany({
      where: filter,
      include: {
        valueHistory: {
          orderBy: { date: "asc" },
          take: 1, // First entry after purchase
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    })) as any[];

    // Calculate purchase details
    const purchaseHistory = assets.map((asset: any) => {
      const purchasePrice = Number(asset.purchasePrice || asset.value);
      const currentValue = Number(asset.value);
      const appreciation = currentValue - purchasePrice;
      const appreciationPercentage = (appreciation / purchasePrice) * 100;

      // Calculate holding period
      let holdingPeriod = { years: 0, months: 0, days: 0 };
      let roi = 0;
      let annualizedROI = 0;

      if (asset.acquisitionDate) {
        const acquisitionDate = new Date(asset.acquisitionDate);
        const now = new Date();
        const diffTime = now.getTime() - acquisitionDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = diffDays % 30;

        holdingPeriod = { years, months, days };

        // ROI calculation
        roi = appreciationPercentage;
        const totalYears = diffDays / 365;
        if (totalYears > 0) {
          annualizedROI =
            (Math.pow(currentValue / purchasePrice, 1 / totalYears) - 1) * 100;
        }
      }

      // Calculate total cost of ownership (if applicable)
      let totalCostOfOwnership = purchasePrice;
      // You could add maintenance, taxes, etc. here

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        description: asset.description,
        purchaseDetails: {
          price: purchasePrice,
          date: asset.acquisitionDate,
          source: "acquisition", // Could be extended
        },
        currentStatus: {
          value: currentValue,
          appreciation,
          appreciationPercentage,
          lastUpdated: asset.updatedAt,
        },
        holdingPeriod,
        returns: {
          roi,
          annualizedROI,
          totalReturn: appreciation,
        },
        costAnalysis: {
          totalCostOfOwnership,
          purchasePrice,
          maintenanceCosts: 0, // Could be extended
          additionalCosts: 0, // Could be extended
        },
        performance: {
          status:
            appreciationPercentage > 10
              ? "excellent"
              : appreciationPercentage > 0
              ? "good"
              : appreciationPercentage > -10
              ? "fair"
              : "poor",
          isAppreciating: appreciation > 0,
        },
      };
    });

    // Summary statistics
    const summary = {
      totalAssets: purchaseHistory.length,
      totalInvestment: purchaseHistory.reduce(
        (sum, p) => sum + p.purchaseDetails.price,
        0
      ),
      totalCurrentValue: purchaseHistory.reduce(
        (sum, p) => sum + p.currentStatus.value,
        0
      ),
      totalAppreciation: purchaseHistory.reduce(
        (sum, p) => sum + p.currentStatus.appreciation,
        0
      ),
      averageROI:
        purchaseHistory.length > 0
          ? purchaseHistory.reduce((sum, p) => sum + p.returns.roi, 0) /
            purchaseHistory.length
          : 0,
      averageHoldingYears:
        purchaseHistory.length > 0
          ? purchaseHistory.reduce((sum, p) => sum + p.holdingPeriod.years, 0) /
            purchaseHistory.length
          : 0,
    };

    // Group by year
    const byYear: Record<string, any> = {};
    purchaseHistory.forEach((p) => {
      if (p.purchaseDetails.date) {
        const year = new Date(p.purchaseDetails.date).getFullYear().toString();
        if (!byYear[year]) {
          byYear[year] = {
            count: 0,
            totalInvestment: 0,
            currentValue: 0,
            assets: [],
          };
        }
        byYear[year].count++;
        byYear[year].totalInvestment += p.purchaseDetails.price;
        byYear[year].currentValue += p.currentStatus.value;
        byYear[year].assets.push({
          name: p.assetName,
          type: p.assetType,
          price: p.purchaseDetails.price,
        });
      }
    });

    // Group by type
    const byType: Record<string, any> = {};
    purchaseHistory.forEach((p) => {
      if (!byType[p.assetType]) {
        byType[p.assetType] = {
          count: 0,
          totalInvestment: 0,
          currentValue: 0,
          averageROI: 0,
        };
      }
      byType[p.assetType].count++;
      byType[p.assetType].totalInvestment += p.purchaseDetails.price;
      byType[p.assetType].currentValue += p.currentStatus.value;
    });

    // Calculate average ROI per type
    Object.keys(byType).forEach((type) => {
      const assetsOfType = purchaseHistory.filter((p) => p.assetType === type);
      byType[type].averageROI =
        assetsOfType.reduce((sum, p) => sum + p.returns.roi, 0) /
        assetsOfType.length;
    });

    // Best and worst performers
    const sortedByROI = [...purchaseHistory].sort(
      (a, b) => b.returns.roi - a.returns.roi
    );
    const bestPerformers = sortedByROI.slice(0, 5);
    const worstPerformers = sortedByROI.slice(-5).reverse();

    return NextResponse.json({
      summary,
      purchaseHistory,
      analytics: {
        byYear,
        byType,
        bestPerformers,
        worstPerformers,
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in purchase history:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
