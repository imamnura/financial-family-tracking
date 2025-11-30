import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/liabilities/interest-calculation
 * Calculate interest and analyze interest costs
 * Query params:
 * - liabilityId: string (optional)
 * - method: "simple" | "compound" | "effective" (default: compound)
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
    const method =
      (searchParams.get("method") as "simple" | "compound" | "effective") ||
      "compound";

    const familyId = user.familyId!;

    // Build filter
    const filter: any = { familyId };
    if (liabilityId) filter.id = liabilityId;

    // Fetch liabilities
    const liabilities = await prisma.liability.findMany({
      where: filter,
      include: {
        payments: {
          orderBy: { paymentDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate interest for each liability
    const interestCalculations = liabilities.map((liability) => {
      const originalAmount = Number(liability.amount);
      const remainingAmount = Number(liability.remainingAmount);
      const interestRate = Number(liability.interestRate || 0);
      const startDate = liability.startDate
        ? new Date(liability.startDate)
        : new Date();
      const today = new Date();

      // Calculate time period
      const daysElapsed = Math.ceil(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const monthsElapsed = daysElapsed / 30;
      const yearsElapsed = daysElapsed / 365;

      // Total interest paid
      const totalInterestPaid = liability.payments.reduce(
        (sum, p) => sum + Number(p.interestPaid),
        0
      );

      // Simple Interest Calculation
      const simpleInterest =
        (originalAmount * interestRate * yearsElapsed) / 100;

      // Compound Interest Calculation (monthly compounding)
      const compoundInterest =
        originalAmount * Math.pow(1 + interestRate / 100 / 12, monthsElapsed) -
        originalAmount;

      // Effective Annual Rate (EAR)
      const effectiveAnnualRate =
        (Math.pow(1 + interestRate / 100 / 12, 12) - 1) * 100;

      // Current accrued interest (since last payment)
      let currentAccruedInterest = 0;
      if (liability.payments.length > 0) {
        const lastPayment = liability.payments[liability.payments.length - 1];
        const daysSinceLastPayment = Math.ceil(
          (today.getTime() - new Date(lastPayment.paymentDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        currentAccruedInterest =
          (remainingAmount * (interestRate / 100) * daysSinceLastPayment) / 365;
      } else {
        currentAccruedInterest =
          (remainingAmount * (interestRate / 100) * daysElapsed) / 365;
      }

      // Monthly interest charge
      const monthlyInterestCharge = (remainingAmount * interestRate) / 100 / 12;

      // Annual interest cost
      const annualInterestCost = (remainingAmount * interestRate) / 100;

      // APR vs APY
      const apr = interestRate; // Annual Percentage Rate (nominal)
      const apy = effectiveAnnualRate; // Annual Percentage Yield (effective)

      // Projected total interest (if continuing at current rate)
      let projectedTotalInterest = totalInterestPaid;
      const monthlyPayment = Number(liability.monthlyPayment || 0);
      if (monthlyPayment > 0 && remainingAmount > 0) {
        // Amortization calculation
        const monthlyRate = interestRate / 100 / 12;
        const paymentsRemaining =
          monthlyRate === 0
            ? remainingAmount / monthlyPayment
            : Math.log(
                monthlyPayment /
                  (monthlyPayment - remainingAmount * monthlyRate)
              ) / Math.log(1 + monthlyRate);

        const totalPayments = monthlyPayment * paymentsRemaining;
        const futureInterest = totalPayments - remainingAmount;
        projectedTotalInterest += futureInterest;
      }

      // Interest rate comparison
      let rateAnalysis: string;
      if (interestRate <= 5) rateAnalysis = "Excellent - Very Low Rate";
      else if (interestRate <= 10) rateAnalysis = "Good - Competitive Rate";
      else if (interestRate <= 15) rateAnalysis = "Fair - Moderate Rate";
      else if (interestRate <= 20) rateAnalysis = "High - Consider Refinancing";
      else rateAnalysis = "Very High - Urgent Refinancing Needed";

      // Monthly interest breakdown
      const monthlyBreakdown: any[] = [];
      let runningBalance = remainingAmount;
      const rate = interestRate / 100 / 12;

      for (
        let i = 0;
        i < Math.min(12, Math.ceil(remainingAmount / (monthlyPayment || 1)));
        i++
      ) {
        const interestCharge = runningBalance * rate;
        const principalPayment = monthlyPayment - interestCharge;
        runningBalance = Math.max(0, runningBalance - principalPayment);

        monthlyBreakdown.push({
          month: i + 1,
          payment: monthlyPayment,
          interestCharge,
          principalPayment,
          remainingBalance: runningBalance,
        });

        if (runningBalance === 0) break;
      }

      return {
        liabilityId: liability.id,
        name: liability.name,
        type: liability.type,
        creditor: liability.creditor,
        originalAmount,
        remainingAmount,
        interestRate,
        apr,
        apy,
        calculations: {
          simpleInterest,
          compoundInterest,
          effectiveAnnualRate,
          currentAccruedInterest,
          monthlyInterestCharge,
          annualInterestCost,
        },
        historicalInterest: {
          totalInterestPaid,
          daysElapsed,
          monthsElapsed,
          yearsElapsed,
        },
        projections: {
          projectedTotalInterest,
          totalCostOfLoan:
            remainingAmount + projectedTotalInterest - totalInterestPaid,
          interestAsPercentOfPrincipal:
            ((projectedTotalInterest - totalInterestPaid) / remainingAmount) *
            100,
        },
        analysis: {
          rateAnalysis,
          interestRateCategory:
            interestRate <= 10 ? "low" : interestRate <= 15 ? "medium" : "high",
        },
        monthlyBreakdown,
      };
    });

    // Overall summary
    const summary = {
      totalLiabilities: interestCalculations.length,
      totalRemainingDebt: interestCalculations.reduce(
        (sum, calc) => sum + calc.remainingAmount,
        0
      ),
      totalInterestPaid: interestCalculations.reduce(
        (sum, calc) => sum + calc.historicalInterest.totalInterestPaid,
        0
      ),
      totalProjectedInterest: interestCalculations.reduce(
        (sum, calc) => sum + calc.projections.projectedTotalInterest,
        0
      ),
      totalMonthlyInterestCharge: interestCalculations.reduce(
        (sum, calc) => sum + calc.calculations.monthlyInterestCharge,
        0
      ),
      totalAnnualInterestCost: interestCalculations.reduce(
        (sum, calc) => sum + calc.calculations.annualInterestCost,
        0
      ),
      averageInterestRate:
        interestCalculations.length > 0
          ? interestCalculations.reduce(
              (sum, calc) => sum + calc.interestRate,
              0
            ) / interestCalculations.length
          : 0,
      highInterestDebts: interestCalculations.filter(
        (calc) => calc.interestRate > 15
      ).length,
    };

    // Recommendations
    const recommendations: string[] = [];
    if (summary.highInterestDebts > 0) {
      recommendations.push(
        `💡 You have ${summary.highInterestDebts} high-interest debt(s). Consider refinancing or prioritizing these for payoff.`
      );
    }

    if (summary.totalMonthlyInterestCharge > 1000000) {
      recommendations.push(
        `⚠️ Your monthly interest charges total Rp ${summary.totalMonthlyInterestCharge.toLocaleString()}. Increasing payments can significantly reduce interest.`
      );
    }

    const highestInterestLiability = interestCalculations.reduce(
      (max, calc) => (calc.interestRate > max.interestRate ? calc : max),
      interestCalculations[0]
    );

    if (
      highestInterestLiability &&
      highestInterestLiability.interestRate > 15
    ) {
      recommendations.push(
        `🎯 Priority: Focus on "${highestInterestLiability.name}" with ${highestInterestLiability.interestRate}% interest rate.`
      );
    }

    return NextResponse.json({
      summary,
      liabilities: interestCalculations,
      recommendations,
      calculationMethod: method,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in interest calculation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
