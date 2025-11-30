import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/liabilities/payment-tracking
 * Track liability payments with comprehensive history
 * Query params:
 * - liabilityId: string (optional)
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
    const liabilityId = searchParams.get("liabilityId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const familyId = user.familyId!;

    // Build filter
    const liabilityFilter: any = { familyId };
    if (liabilityId) liabilityFilter.id = liabilityId;

    // Build payment filter
    const paymentFilter: any = {};
    if (startDate) paymentFilter.paymentDate = { gte: new Date(startDate) };
    if (endDate) {
      paymentFilter.paymentDate = {
        ...paymentFilter.paymentDate,
        lte: new Date(endDate),
      };
    }

    // Fetch liabilities with payments
    const liabilities = await prisma.liability.findMany({
      where: liabilityFilter,
      include: {
        payments: {
          where: paymentFilter,
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate tracking data
    const trackingData = liabilities.map((liability: any) => {
      const originalAmount = Number(liability.amount);
      const remainingAmount = Number(liability.remainingAmount);
      const interestRate = Number(liability.interestRate || 0);

      const payments = liability.payments.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        principalPaid: Number(p.principalPaid),
        interestPaid: Number(p.interestPaid),
        paymentDate: p.paymentDate,
        notes: p.notes,
        paymentMethod: p.paymentMethod,
      }));

      // Calculate totals
      const totalPaid = payments.reduce(
        (sum: number, p: any) => sum + p.amount,
        0
      );
      const totalPrincipalPaid = payments.reduce(
        (sum: number, p: any) => sum + p.principalPaid,
        0
      );
      const totalInterestPaid = payments.reduce(
        (sum: number, p: any) => sum + p.interestPaid,
        0
      );

      // Payment progress
      const paymentProgress = (totalPaid / originalAmount) * 100;
      const principalProgress = (totalPrincipalPaid / originalAmount) * 100;

      // Calculate payment consistency
      let avgMonthlyPayment = 0;
      let paymentConsistency = "N/A";

      if (payments.length > 1) {
        avgMonthlyPayment = totalPaid / payments.length;

        // Check variance in payment amounts
        const variance =
          payments.reduce(
            (sum: number, p: any) =>
              sum + Math.pow(p.amount - avgMonthlyPayment, 2),
            0
          ) / payments.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = (stdDev / avgMonthlyPayment) * 100;

        if (coefficientOfVariation < 10) paymentConsistency = "Excellent";
        else if (coefficientOfVariation < 20) paymentConsistency = "Good";
        else if (coefficientOfVariation < 30) paymentConsistency = "Fair";
        else paymentConsistency = "Inconsistent";
      }

      // Monthly breakdown
      const monthlyBreakdown: Record<string, any> = {};
      payments.forEach((p: any) => {
        const monthKey = new Date(p.paymentDate).toLocaleDateString("id-ID", {
          month: "short",
          year: "numeric",
        });
        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = {
            totalAmount: 0,
            principalPaid: 0,
            interestPaid: 0,
            paymentCount: 0,
          };
        }
        monthlyBreakdown[monthKey].totalAmount += p.amount;
        monthlyBreakdown[monthKey].principalPaid += p.principalPaid;
        monthlyBreakdown[monthKey].interestPaid += p.interestPaid;
        monthlyBreakdown[monthKey].paymentCount++;
      });

      // Estimated completion
      let estimatedMonthsRemaining = 0;
      let estimatedCompletionDate = null;

      if (avgMonthlyPayment > 0 && remainingAmount > 0) {
        estimatedMonthsRemaining = Math.ceil(
          remainingAmount / avgMonthlyPayment
        );
        estimatedCompletionDate = new Date();
        estimatedCompletionDate.setMonth(
          estimatedCompletionDate.getMonth() + estimatedMonthsRemaining
        );
      }

      return {
        liabilityId: liability.id,
        liabilityName: liability.name,
        type: liability.type,
        creditor: liability.creditor,
        originalAmount,
        remainingAmount,
        interestRate,
        startDate: liability.startDate,
        dueDate: liability.dueDate,
        paymentSummary: {
          totalPayments: payments.length,
          totalPaid,
          totalPrincipalPaid,
          totalInterestPaid,
          avgMonthlyPayment,
          paymentProgress,
          principalProgress,
          paymentConsistency,
        },
        forecast: {
          estimatedMonthsRemaining,
          estimatedCompletionDate,
          projectedTotalInterest:
            totalInterestPaid + remainingAmount * (interestRate / 100),
        },
        recentPayments: payments.slice(0, 10),
        monthlyBreakdown,
      };
    });

    // Overall summary
    const summary = {
      totalLiabilities: trackingData.length,
      totalOriginalDebt: trackingData.reduce(
        (sum, t) => sum + t.originalAmount,
        0
      ),
      totalRemainingDebt: trackingData.reduce(
        (sum, t) => sum + t.remainingAmount,
        0
      ),
      totalPaid: trackingData.reduce(
        (sum, t) => sum + t.paymentSummary.totalPaid,
        0
      ),
      totalInterestPaid: trackingData.reduce(
        (sum, t) => sum + t.paymentSummary.totalInterestPaid,
        0
      ),
      overallProgress:
        trackingData.length > 0
          ? trackingData.reduce(
              (sum, t) => sum + t.paymentSummary.paymentProgress,
              0
            ) / trackingData.length
          : 0,
    };

    return NextResponse.json({
      summary,
      liabilities: trackingData,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in payment tracking:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/liabilities/payment-tracking
 * Record a new payment
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
    const {
      liabilityId,
      amount,
      principalPaid,
      interestPaid,
      paymentDate,
      notes,
      paymentMethod,
    } = body;

    if (!liabilityId || amount === undefined) {
      return NextResponse.json(
        { error: "liabilityId and amount are required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;

    // Verify liability belongs to family
    const liability = await prisma.liability.findFirst({
      where: { id: liabilityId, familyId },
    });

    if (!liability) {
      return NextResponse.json(
        { error: "Liability not found" },
        { status: 404 }
      );
    }

    // Create payment record
    const payment = await (prisma as any).liabilityPayment.create({
      data: {
        liabilityId,
        amount: Number(amount),
        principalPaid: Number(principalPaid || amount),
        interestPaid: Number(interestPaid || 0),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes,
        paymentMethod,
      },
    });

    // Update remaining amount
    const newRemainingAmount = Math.max(
      Number(liability.remainingAmount) - Number(principalPaid || amount),
      0
    );

    await prisma.liability.update({
      where: { id: liabilityId },
      data: { remainingAmount: newRemainingAmount },
    });

    return NextResponse.json({
      success: true,
      payment,
      newRemainingAmount,
      message: "Payment recorded successfully",
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
