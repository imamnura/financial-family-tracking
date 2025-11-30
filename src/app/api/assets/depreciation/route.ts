import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/assets/depreciation
 * Calculate asset depreciation with multiple methods
 * Query params:
 * - assetId: string (required)
 * - method: straight_line | declining_balance | sum_of_years (default: straight_line)
 * - usefulLife: number in years (optional, default based on asset type)
 * - salvageValue: number (optional, default 0)
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
    const method = searchParams.get("method") || "straight_line";
    const usefulLifeParam = searchParams.get("usefulLife");
    const salvageValueParam = searchParams.get("salvageValue");

    if (!assetId) {
      return NextResponse.json(
        { error: "assetId is required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;

    // Fetch asset
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, familyId },
      include: {
        valueHistory: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Determine useful life based on asset type (in years)
    const defaultUsefulLife: Record<string, number> = {
      VEHICLE: 10,
      PROPERTY: 30,
      INVESTMENT: 0, // No depreciation
      SAVINGS: 0, // No depreciation
      OTHER: 5,
    };

    const usefulLife = usefulLifeParam
      ? parseInt(usefulLifeParam)
      : asset.depreciationRate
      ? 100 / asset.depreciationRate // If depreciation rate is set
      : defaultUsefulLife[asset.type] || 5;

    const purchasePrice = Number(asset.purchasePrice || asset.value);
    const salvageValue = salvageValueParam
      ? parseFloat(salvageValueParam)
      : purchasePrice * 0.1; // Default 10% salvage value

    // Calculate age of asset
    const acquisitionDate = asset.acquisitionDate
      ? new Date(asset.acquisitionDate)
      : new Date(asset.createdAt);
    const currentDate = new Date();
    const ageInYears =
      (currentDate.getTime() - acquisitionDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365);

    // Method 1: Straight-Line Depreciation
    const straightLineAnnualDepreciation =
      usefulLife > 0 ? (purchasePrice - salvageValue) / usefulLife : 0;
    const straightLineAccumulatedDepreciation = Math.min(
      straightLineAnnualDepreciation * ageInYears,
      purchasePrice - salvageValue
    );
    const straightLineBookValue = Math.max(
      purchasePrice - straightLineAccumulatedDepreciation,
      salvageValue
    );
    const straightLineDepreciationRate =
      usefulLife > 0 ? (1 / usefulLife) * 100 : 0;

    // Method 2: Declining Balance (Double Declining)
    const decliningBalanceRate = usefulLife > 0 ? (2 / usefulLife) * 100 : 0;
    let decliningBalanceBookValue = purchasePrice;
    let decliningBalanceAccumulatedDepreciation = 0;

    for (let year = 1; year <= Math.ceil(ageInYears); year++) {
      const yearDepreciation =
        decliningBalanceBookValue * (decliningBalanceRate / 100);
      decliningBalanceAccumulatedDepreciation += yearDepreciation;
      decliningBalanceBookValue = Math.max(
        decliningBalanceBookValue - yearDepreciation,
        salvageValue
      );
    }

    // Method 3: Sum of Years' Digits
    const sumOfYears = usefulLife > 0 ? (usefulLife * (usefulLife + 1)) / 2 : 0;
    const currentYear = Math.ceil(ageInYears);
    const remainingYears = Math.max(usefulLife - currentYear + 1, 0);

    let sumOfYearsAccumulatedDepreciation = 0;
    for (let year = 1; year <= Math.min(currentYear, usefulLife); year++) {
      const yearFraction = (usefulLife - year + 1) / sumOfYears;
      sumOfYearsAccumulatedDepreciation +=
        (purchasePrice - salvageValue) * yearFraction;
    }
    const sumOfYearsBookValue = Math.max(
      purchasePrice - sumOfYearsAccumulatedDepreciation,
      salvageValue
    );

    // Generate year-by-year schedule for all methods
    const depreciationSchedule = [];
    for (let year = 1; year <= usefulLife; year++) {
      // Straight-Line
      const slDepreciation = straightLineAnnualDepreciation;
      const slAccumulated = Math.min(
        slDepreciation * year,
        purchasePrice - salvageValue
      );
      const slBookValue = Math.max(purchasePrice - slAccumulated, salvageValue);

      // Declining Balance
      let dbBookValue = purchasePrice;
      let dbAccumulated = 0;
      for (let y = 1; y <= year; y++) {
        const yearDep = dbBookValue * (decliningBalanceRate / 100);
        dbAccumulated += yearDep;
        dbBookValue = Math.max(dbBookValue - yearDep, salvageValue);
      }

      // Sum of Years
      let sydAccumulated = 0;
      for (let y = 1; y <= year; y++) {
        const yearFraction = (usefulLife - y + 1) / sumOfYears;
        sydAccumulated += (purchasePrice - salvageValue) * yearFraction;
      }
      const sydBookValue = Math.max(
        purchasePrice - sydAccumulated,
        salvageValue
      );

      depreciationSchedule.push({
        year,
        straightLine: {
          annualDepreciation: slDepreciation,
          accumulatedDepreciation: slAccumulated,
          bookValue: slBookValue,
        },
        decliningBalance: {
          annualDepreciation:
            year === 1 ? purchasePrice * (decliningBalanceRate / 100) : 0,
          accumulatedDepreciation: dbAccumulated,
          bookValue: dbBookValue,
        },
        sumOfYears: {
          annualDepreciation:
            (purchasePrice - salvageValue) *
            ((usefulLife - year + 1) / sumOfYears),
          accumulatedDepreciation: sydAccumulated,
          bookValue: sydBookValue,
        },
      });
    }

    // Comparison with market value
    const currentMarketValue = Number(asset.value);
    const depreciationMethods = {
      straightLine: {
        currentBookValue: straightLineBookValue,
        variance: currentMarketValue - straightLineBookValue,
        variancePercentage:
          straightLineBookValue > 0
            ? ((currentMarketValue - straightLineBookValue) /
                straightLineBookValue) *
              100
            : 0,
      },
      decliningBalance: {
        currentBookValue: decliningBalanceBookValue,
        variance: currentMarketValue - decliningBalanceBookValue,
        variancePercentage:
          decliningBalanceBookValue > 0
            ? ((currentMarketValue - decliningBalanceBookValue) /
                decliningBalanceBookValue) *
              100
            : 0,
      },
      sumOfYears: {
        currentBookValue: sumOfYearsBookValue,
        variance: currentMarketValue - sumOfYearsBookValue,
        variancePercentage:
          sumOfYearsBookValue > 0
            ? ((currentMarketValue - sumOfYearsBookValue) /
                sumOfYearsBookValue) *
              100
            : 0,
      },
    };

    // Determine best method (closest to market value)
    const methodAccuracy = [
      {
        method: "straightLine",
        accuracy: Math.abs(depreciationMethods.straightLine.variancePercentage),
      },
      {
        method: "decliningBalance",
        accuracy: Math.abs(
          depreciationMethods.decliningBalance.variancePercentage
        ),
      },
      {
        method: "sumOfYears",
        accuracy: Math.abs(depreciationMethods.sumOfYears.variancePercentage),
      },
    ].sort((a, b) => a.accuracy - b.accuracy);

    const recommendedMethod = methodAccuracy[0].method;

    // Calculate remaining useful life
    const remainingUsefulLife = Math.max(usefulLife - ageInYears, 0);
    const remainingDepreciation = Math.max(
      straightLineBookValue - salvageValue,
      0
    );

    return NextResponse.json({
      assetInfo: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        purchasePrice,
        currentMarketValue,
        acquisitionDate,
        ageInYears: parseFloat(ageInYears.toFixed(2)),
      },
      parameters: {
        usefulLife,
        salvageValue,
        depreciableAmount: purchasePrice - salvageValue,
        method: method as string,
      },
      currentDepreciation:
        depreciationMethods[method as keyof typeof depreciationMethods] ||
        depreciationMethods.straightLine,
      allMethods: depreciationMethods,
      recommendations: {
        recommendedMethod,
        reason: `Method with closest book value to market value (${methodAccuracy[0].accuracy.toFixed(
          2
        )}% variance)`,
      },
      forecast: {
        remainingUsefulLife: parseFloat(remainingUsefulLife.toFixed(2)),
        remainingDepreciation,
        estimatedSalvageValue: salvageValue,
        totalDepreciationToDate:
          method === "straight_line"
            ? straightLineAccumulatedDepreciation
            : method === "declining_balance"
            ? decliningBalanceAccumulatedDepreciation
            : sumOfYearsAccumulatedDepreciation,
      },
      depreciationSchedule,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in depreciation calculator:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
