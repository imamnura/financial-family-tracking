import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/liabilities/payoff-simulation
 * Simulate different payoff scenarios
 * Query params:
 * - liabilityId: string (required)
 * - extraMonthlyPayment: number (optional, default: 0)
 * - targetMonths: number (optional)
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
    const extraMonthlyPayment = parseFloat(
      searchParams.get("extraMonthlyPayment") || "0"
    );
    const targetMonths = searchParams.get("targetMonths")
      ? parseInt(searchParams.get("targetMonths")!)
      : null;

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
      include: {
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 1,
        },
      },
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
        { error: "Monthly payment must be set for simulation" },
        { status: 400 }
      );
    }

    const monthlyRate = interestRate / 100 / 12;

    // Helper function to generate amortization schedule
    function generateAmortizationSchedule(
      principal: number,
      monthlyPayment: number,
      monthlyInterestRate: number,
      maxMonths: number = 600 // 50 years max
    ) {
      const schedule: any[] = [];
      let balance = principal;
      let totalInterest = 0;
      let month = 1;

      while (balance > 0.01 && month <= maxMonths) {
        const interestCharge = balance * monthlyInterestRate;
        const principalPayment = Math.min(
          monthlyPayment - interestCharge,
          balance
        );
        const payment = interestCharge + principalPayment;

        balance = Math.max(0, balance - principalPayment);
        totalInterest += interestCharge;

        schedule.push({
          month,
          payment,
          principalPayment,
          interestPayment: interestCharge,
          remainingBalance: balance,
          cumulativeInterest: totalInterest,
          cumulativePrincipal: principal - balance,
        });

        month++;

        if (balance === 0) break;
      }

      return {
        schedule,
        totalMonths: schedule.length,
        totalPaid: schedule.reduce((sum, s) => sum + s.payment, 0),
        totalInterest,
        totalPrincipal: principal,
      };
    }

    // Scenario 1: Current/Standard Payment
    const standardScenario = generateAmortizationSchedule(
      remainingAmount,
      baseMonthlyPayment,
      monthlyRate
    );

    // Scenario 2: With Extra Payment
    const extraPaymentScenario = generateAmortizationSchedule(
      remainingAmount,
      baseMonthlyPayment + extraMonthlyPayment,
      monthlyRate
    );

    // Scenario 3: Double Payment
    const doublePaymentScenario = generateAmortizationSchedule(
      remainingAmount,
      baseMonthlyPayment * 2,
      monthlyRate
    );

    // Scenario 4: Aggressive Payment (paying 50% more)
    const aggressiveScenario = generateAmortizationSchedule(
      remainingAmount,
      baseMonthlyPayment * 1.5,
      monthlyRate
    );

    // Scenario 5: Target Months (if specified)
    let targetScenario = null;
    if (targetMonths) {
      // Calculate required monthly payment to payoff in target months
      const requiredPayment =
        monthlyRate === 0
          ? remainingAmount / targetMonths
          : (remainingAmount *
              monthlyRate *
              Math.pow(1 + monthlyRate, targetMonths)) /
            (Math.pow(1 + monthlyRate, targetMonths) - 1);

      targetScenario = {
        targetMonths,
        requiredMonthlyPayment: requiredPayment,
        increaseNeeded: requiredPayment - baseMonthlyPayment,
        increasePercentage:
          ((requiredPayment - baseMonthlyPayment) / baseMonthlyPayment) * 100,
        ...generateAmortizationSchedule(
          remainingAmount,
          requiredPayment,
          monthlyRate,
          targetMonths
        ),
      };
    }

    // Comparison summary
    const comparison = {
      standard: {
        name: "Current Payment",
        monthlyPayment: baseMonthlyPayment,
        totalMonths: standardScenario.totalMonths,
        totalPaid: standardScenario.totalPaid,
        totalInterest: standardScenario.totalInterest,
        payoffDate: new Date(
          new Date().setMonth(
            new Date().getMonth() + standardScenario.totalMonths
          )
        ),
      },
      withExtra: {
        name: "With Extra Payment",
        monthlyPayment: baseMonthlyPayment + extraMonthlyPayment,
        totalMonths: extraPaymentScenario.totalMonths,
        totalPaid: extraPaymentScenario.totalPaid,
        totalInterest: extraPaymentScenario.totalInterest,
        payoffDate: new Date(
          new Date().setMonth(
            new Date().getMonth() + extraPaymentScenario.totalMonths
          )
        ),
        savings: {
          interestSaved:
            standardScenario.totalInterest - extraPaymentScenario.totalInterest,
          monthsSaved:
            standardScenario.totalMonths - extraPaymentScenario.totalMonths,
        },
      },
      double: {
        name: "Double Payment",
        monthlyPayment: baseMonthlyPayment * 2,
        totalMonths: doublePaymentScenario.totalMonths,
        totalPaid: doublePaymentScenario.totalPaid,
        totalInterest: doublePaymentScenario.totalInterest,
        payoffDate: new Date(
          new Date().setMonth(
            new Date().getMonth() + doublePaymentScenario.totalMonths
          )
        ),
        savings: {
          interestSaved:
            standardScenario.totalInterest -
            doublePaymentScenario.totalInterest,
          monthsSaved:
            standardScenario.totalMonths - doublePaymentScenario.totalMonths,
        },
      },
      aggressive: {
        name: "Aggressive (50% More)",
        monthlyPayment: baseMonthlyPayment * 1.5,
        totalMonths: aggressiveScenario.totalMonths,
        totalPaid: aggressiveScenario.totalPaid,
        totalInterest: aggressiveScenario.totalInterest,
        payoffDate: new Date(
          new Date().setMonth(
            new Date().getMonth() + aggressiveScenario.totalMonths
          )
        ),
        savings: {
          interestSaved:
            standardScenario.totalInterest - aggressiveScenario.totalInterest,
          monthsSaved:
            standardScenario.totalMonths - aggressiveScenario.totalMonths,
        },
      },
    };

    // Recommendations
    const recommendations: string[] = [];

    if (extraPaymentScenario.totalMonths < standardScenario.totalMonths) {
      const monthsSaved =
        standardScenario.totalMonths - extraPaymentScenario.totalMonths;
      const interestSaved =
        standardScenario.totalInterest - extraPaymentScenario.totalInterest;
      recommendations.push(
        `💡 Adding Rp ${extraMonthlyPayment.toLocaleString()} per month saves ${monthsSaved} months and Rp ${interestSaved.toLocaleString()} in interest.`
      );
    }

    if (doublePaymentScenario.totalMonths < standardScenario.totalMonths / 2) {
      recommendations.push(
        `🚀 Doubling your payment can cut your payoff time by more than half!`
      );
    }

    if (standardScenario.totalInterest > remainingAmount * 0.5) {
      recommendations.push(
        `⚠️ You'll pay over 50% of the principal in interest. Consider increasing payments.`
      );
    }

    // Visual payoff chart data (yearly summary)
    const payoffChart = {
      standard: generateYearlySummary(standardScenario.schedule),
      withExtra: generateYearlySummary(extraPaymentScenario.schedule),
      double: generateYearlySummary(doublePaymentScenario.schedule),
    };

    function generateYearlySummary(schedule: any[]) {
      const yearly: any[] = [];
      for (let year = 1; year <= Math.ceil(schedule.length / 12); year++) {
        const yearSchedule = schedule.filter(
          (s) => s.month > (year - 1) * 12 && s.month <= year * 12
        );
        if (yearSchedule.length > 0) {
          const lastMonth = yearSchedule[yearSchedule.length - 1];
          yearly.push({
            year,
            principalPaid: yearSchedule.reduce(
              (sum, s) => sum + s.principalPayment,
              0
            ),
            interestPaid: yearSchedule.reduce(
              (sum, s) => sum + s.interestPayment,
              0
            ),
            remainingBalance: lastMonth.remainingBalance,
          });
        }
      }
      return yearly;
    }

    return NextResponse.json({
      liability: {
        id: liability.id,
        name: liability.name,
        remainingAmount,
        interestRate,
        baseMonthlyPayment,
      },
      scenarios: {
        standard: {
          ...standardScenario,
          description: "Continue with current payment plan",
        },
        withExtra: {
          ...extraPaymentScenario,
          extraPayment: extraMonthlyPayment,
          description: `Add Rp ${extraMonthlyPayment.toLocaleString()} per month`,
        },
        double: {
          ...doublePaymentScenario,
          description: "Double your monthly payment",
        },
        aggressive: {
          ...aggressiveScenario,
          description: "Pay 50% more each month",
        },
        ...(targetScenario && { target: targetScenario }),
      },
      comparison,
      recommendations,
      payoffChart,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in payoff simulation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
