import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/liabilities/early-payment
 * Calculate impact of early/extra payments
 * Query params:
 * - liabilityId: string (required)
 * - oneTimePayment: number (optional) - One-time extra payment
 * - recurringExtraPayment: number (optional) - Extra payment per month
 * - yearlyBonusPayment: number (optional) - Annual bonus payment
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
    const liabilityId = searchParams.get("liabilityId");
    const oneTimePayment = parseFloat(
      searchParams.get("oneTimePayment") || "0"
    );
    const recurringExtraPayment = parseFloat(
      searchParams.get("recurringExtraPayment") || "0"
    );
    const yearlyBonusPayment = parseFloat(
      searchParams.get("yearlyBonusPayment") || "0"
    );

    if (!liabilityId) {
      return NextResponse.json(
        { error: "liabilityId is required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;

    // Fetch liability
    const liability = await prisma.liability.findFirst({
      where: { id: liabilityId, familyId },
    });

    if (!liability) {
      return NextResponse.json(
        { error: "Liability not found" },
        { status: 404 }
      );
    }

    const remainingAmount = Number(liability.remainingAmount);
    const interestRate = Number(liability.interestRate || 0);
    const baseMonthlyPayment = Number(liability.monthlyPayment || 0);

    if (baseMonthlyPayment === 0) {
      return NextResponse.json(
        { error: "Monthly payment must be set" },
        { status: 400 }
      );
    }

    const monthlyRate = interestRate / 100 / 12;

    // Helper function to calculate payoff with extra payments
    function calculatePayoff(
      principal: number,
      monthlyPayment: number,
      monthlyInterestRate: number,
      oneTime: number = 0,
      recurringExtra: number = 0,
      yearlyBonus: number = 0
    ) {
      let balance = principal;
      let totalInterest = 0;
      let totalPaid = 0;
      let month = 0;
      const schedule: any[] = [];

      // Apply one-time payment immediately
      if (oneTime > 0) {
        balance = Math.max(0, balance - oneTime);
        totalPaid += oneTime;
        schedule.push({
          month: 0,
          type: "one-time",
          payment: oneTime,
          principalPayment: oneTime,
          interestPayment: 0,
          remainingBalance: balance,
        });
      }

      while (balance > 0.01 && month < 600) {
        month++;
        const interestCharge = balance * monthlyInterestRate;

        // Calculate payment for this month
        let payment = monthlyPayment + recurringExtra;

        // Add yearly bonus (every 12 months)
        if (yearlyBonus > 0 && month % 12 === 0) {
          payment += yearlyBonus;
        }

        const principalPayment = Math.min(payment - interestCharge, balance);
        const actualPayment = interestCharge + principalPayment;

        balance = Math.max(0, balance - principalPayment);
        totalInterest += interestCharge;
        totalPaid += actualPayment;

        schedule.push({
          month,
          type: "regular",
          payment: actualPayment,
          principalPayment,
          interestPayment: interestCharge,
          remainingBalance: balance,
          cumulativeInterest: totalInterest,
          cumulativePaid: totalPaid,
        });

        if (balance === 0) break;
      }

      return {
        schedule,
        totalMonths: month,
        totalPaid,
        totalInterest,
        averageMonthlyPayment: totalPaid / month,
        payoffDate: new Date(
          new Date().setMonth(new Date().getMonth() + month)
        ),
      };
    }

    // Baseline scenario (no extra payments)
    const baseline = calculatePayoff(
      remainingAmount,
      baseMonthlyPayment,
      monthlyRate
    );

    // Scenario 1: One-time payment only
    const oneTimeScenario = calculatePayoff(
      remainingAmount,
      baseMonthlyPayment,
      monthlyRate,
      oneTimePayment
    );

    // Scenario 2: Recurring extra payment only
    const recurringScenario = calculatePayoff(
      remainingAmount,
      baseMonthlyPayment,
      monthlyRate,
      0,
      recurringExtraPayment
    );

    // Scenario 3: Yearly bonus only
    const yearlyScenario = calculatePayoff(
      remainingAmount,
      baseMonthlyPayment,
      monthlyRate,
      0,
      0,
      yearlyBonusPayment
    );

    // Scenario 4: Combined (all extra payments)
    const combinedScenario = calculatePayoff(
      remainingAmount,
      baseMonthlyPayment,
      monthlyRate,
      oneTimePayment,
      recurringExtraPayment,
      yearlyBonusPayment
    );

    // Calculate savings for each scenario
    function calculateSavings(scenario: any, baseline: any) {
      return {
        monthsSaved: baseline.totalMonths - scenario.totalMonths,
        interestSaved: baseline.totalInterest - scenario.totalInterest,
        totalSaved: baseline.totalPaid - scenario.totalPaid,
        percentageReduction:
          ((baseline.totalInterest - scenario.totalInterest) /
            baseline.totalInterest) *
          100,
        yearsSaved: (baseline.totalMonths - scenario.totalMonths) / 12,
      };
    }

    // Impact analysis
    const impact = {
      oneTime: {
        ...oneTimeScenario,
        extraPayment: oneTimePayment,
        savings: calculateSavings(oneTimeScenario, baseline),
        description: "One-time extra payment",
        effectivenessScore:
          oneTimePayment > 0
            ? (baseline.totalInterest - oneTimeScenario.totalInterest) /
              oneTimePayment
            : 0,
      },
      recurring: {
        ...recurringScenario,
        extraPayment: recurringExtraPayment,
        totalExtraPaid: recurringExtraPayment * recurringScenario.totalMonths,
        savings: calculateSavings(recurringScenario, baseline),
        description: `Extra Rp ${recurringExtraPayment.toLocaleString()} per month`,
        effectivenessScore:
          recurringExtraPayment > 0
            ? (baseline.totalInterest - recurringScenario.totalInterest) /
              (recurringExtraPayment * recurringScenario.totalMonths)
            : 0,
      },
      yearly: {
        ...yearlyScenario,
        extraPayment: yearlyBonusPayment,
        totalExtraPaid:
          yearlyBonusPayment * Math.ceil(yearlyScenario.totalMonths / 12),
        savings: calculateSavings(yearlyScenario, baseline),
        description: `Yearly bonus payment of Rp ${yearlyBonusPayment.toLocaleString()}`,
        effectivenessScore:
          yearlyBonusPayment > 0
            ? (baseline.totalInterest - yearlyScenario.totalInterest) /
              (yearlyBonusPayment * Math.ceil(yearlyScenario.totalMonths / 12))
            : 0,
      },
      combined: {
        ...combinedScenario,
        totalExtraPaid:
          oneTimePayment +
          recurringExtraPayment * combinedScenario.totalMonths +
          yearlyBonusPayment * Math.ceil(combinedScenario.totalMonths / 12),
        savings: calculateSavings(combinedScenario, baseline),
        description: "All extra payments combined",
        effectivenessScore:
          oneTimePayment +
            recurringExtraPayment * combinedScenario.totalMonths +
            yearlyBonusPayment * Math.ceil(combinedScenario.totalMonths / 12) >
          0
            ? (baseline.totalInterest - combinedScenario.totalInterest) /
              (oneTimePayment +
                recurringExtraPayment * combinedScenario.totalMonths +
                yearlyBonusPayment *
                  Math.ceil(combinedScenario.totalMonths / 12))
            : 0,
      },
    };

    // Multiple scenario analysis (different extra payment amounts)
    const multipleScenarios = [
      { amount: 100000, label: "Rp 100K/month" },
      { amount: 250000, label: "Rp 250K/month" },
      { amount: 500000, label: "Rp 500K/month" },
      { amount: 1000000, label: "Rp 1M/month" },
      { amount: 2000000, label: "Rp 2M/month" },
    ].map((scenario) => {
      const result = calculatePayoff(
        remainingAmount,
        baseMonthlyPayment,
        monthlyRate,
        0,
        scenario.amount
      );
      return {
        ...scenario,
        totalMonths: result.totalMonths,
        totalInterest: result.totalInterest,
        savings: calculateSavings(result, baseline),
        roi:
          ((baseline.totalInterest - result.totalInterest) /
            (scenario.amount * result.totalMonths)) *
          100,
      };
    });

    // Recommendations
    const recommendations: string[] = [];

    // Find most effective strategy
    const strategies = [
      { name: "one-time", score: impact.oneTime.effectivenessScore },
      { name: "recurring", score: impact.recurring.effectivenessScore },
      { name: "yearly", score: impact.yearly.effectivenessScore },
    ].sort((a, b) => b.score - a.score);

    if (strategies[0].score > 0) {
      recommendations.push(
        `💡 Most effective: ${strategies[0].name} payment strategy (${(
          strategies[0].score * 100
        ).toFixed(1)}% return on extra payment)`
      );
    }

    if (impact.combined.savings.interestSaved > remainingAmount * 0.1) {
      recommendations.push(
        `🎯 Combined strategy saves Rp ${impact.combined.savings.interestSaved.toLocaleString()} in interest (${impact.combined.savings.percentageReduction.toFixed(
          1
        )}% reduction)`
      );
    }

    if (impact.combined.savings.yearsSaved >= 1) {
      recommendations.push(
        `⏱️ Extra payments can cut ${impact.combined.savings.yearsSaved.toFixed(
          1
        )} years off your loan term`
      );
    }

    // Break-even analysis
    const breakEven = {
      oneTime:
        oneTimePayment > 0
          ? {
              months: Math.ceil(
                oneTimePayment /
                  ((baseline.totalInterest - oneTimeScenario.totalInterest) /
                    baseline.totalMonths)
              ),
              description: "Months until one-time payment breaks even",
            }
          : null,
      recurring:
        recurringExtraPayment > 0
          ? {
              months: Math.ceil(
                recurringExtraPayment /
                  ((baseline.totalInterest - recurringScenario.totalInterest) /
                    recurringScenario.totalMonths)
              ),
              description: "Months until recurring extra payment breaks even",
            }
          : null,
    };

    return NextResponse.json({
      liability: {
        id: liability.id,
        name: liability.name,
        remainingAmount,
        interestRate,
        baseMonthlyPayment,
      },
      baseline: {
        ...baseline,
        description: "Current payment plan (no extra payments)",
      },
      impact,
      multipleScenarios,
      recommendations,
      breakEven,
      summary: {
        bestStrategy: strategies[0].name,
        maxInterestSavings: impact.combined.savings.interestSaved,
        maxTimeSavings: impact.combined.savings.monthsSaved,
        optimalExtraPayment: multipleScenarios.reduce((best, scenario) =>
          scenario.roi > best.roi ? scenario : best
        ),
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in early payment calculator:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
