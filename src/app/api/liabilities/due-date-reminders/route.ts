import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/liabilities/due-date-reminders
 * Get upcoming payment reminders and overdue alerts
 * Query params:
 * - daysAhead: number (default: 30)
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
    const daysAhead = parseInt(searchParams.get("daysAhead") || "30");

    const familyId = user.familyId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Fetch liabilities with payments
    const liabilities = (await prisma.liability.findMany({
      where: {
        familyId,
        remainingAmount: { gt: 0 },
      },
      include: {
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 5,
        },
      },
      orderBy: { dueDate: "asc" },
    })) as any[];

    // Calculate reminders
    const reminders = liabilities.map((liability: any) => {
      const dueDate = liability.dueDate ? new Date(liability.dueDate) : null;
      const monthlyPayment = Number(liability.monthlyPayment || 0);
      const remainingAmount = Number(liability.remainingAmount);
      const interestRate = Number(liability.interestRate || 0);

      // Calculate days until due
      let daysUntilDue: number | null = null;
      let isOverdue = false;
      let urgencyLevel: "critical" | "high" | "medium" | "low" = "low";

      if (dueDate) {
        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);
        daysUntilDue = Math.ceil(
          (dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDue < 0) {
          isOverdue = true;
          urgencyLevel = "critical";
        } else if (daysUntilDue <= 3) {
          urgencyLevel = "critical";
        } else if (daysUntilDue <= 7) {
          urgencyLevel = "high";
        } else if (daysUntilDue <= 14) {
          urgencyLevel = "medium";
        }
      }

      // Estimate next payment date based on payment history
      let estimatedNextPaymentDate: Date | null = null;
      if ((liability as any).payments.length > 0) {
        const lastPayment = (liability as any).payments[0];
        estimatedNextPaymentDate = new Date(lastPayment.paymentDate);
        estimatedNextPaymentDate.setMonth(
          estimatedNextPaymentDate.getMonth() + 1
        );
      } else if (liability.startDate) {
        estimatedNextPaymentDate = new Date(liability.startDate);
        estimatedNextPaymentDate.setMonth(
          estimatedNextPaymentDate.getMonth() + 1
        );
      }

      // Calculate interest accrued since last payment
      let interestAccrued = 0;
      if ((liability as any).payments.length > 0 && interestRate > 0) {
        const lastPayment = (liability as any).payments[0];
        const daysSinceLastPayment = Math.ceil(
          (today.getTime() - new Date(lastPayment.paymentDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        interestAccrued =
          (remainingAmount * (interestRate / 100) * daysSinceLastPayment) / 365;
      }

      // Payment recommendations
      const recommendations: string[] = [];
      if (isOverdue) {
        recommendations.push(
          `🚨 OVERDUE: Payment was due ${Math.abs(daysUntilDue!)} days ago!`
        );
      } else if (daysUntilDue !== null && daysUntilDue <= 7) {
        recommendations.push(
          `⚠️ Payment due in ${daysUntilDue} days. Consider paying now.`
        );
      }

      if (monthlyPayment > 0 && monthlyPayment < remainingAmount * 0.02) {
        recommendations.push(
          "💡 Your monthly payment is very low. Consider increasing it to reduce interest."
        );
      }

      if (interestRate > 15) {
        recommendations.push(
          "💡 High interest rate detected. Consider refinancing or prioritizing this debt."
        );
      }

      // Notification settings
      const notifications: any[] = [];
      if (daysUntilDue !== null) {
        if (daysUntilDue === 0) {
          notifications.push({
            type: "due_today",
            message: `Payment for ${liability.name} is due TODAY!`,
            priority: "critical",
          });
        } else if (daysUntilDue === 3) {
          notifications.push({
            type: "3_days_reminder",
            message: `Payment for ${liability.name} due in 3 days`,
            priority: "high",
          });
        } else if (daysUntilDue === 7) {
          notifications.push({
            type: "7_days_reminder",
            message: `Payment for ${liability.name} due in 1 week`,
            priority: "medium",
          });
        } else if (isOverdue) {
          notifications.push({
            type: "overdue",
            message: `OVERDUE: ${liability.name} payment was due ${Math.abs(
              daysUntilDue
            )} days ago`,
            priority: "critical",
          });
        }
      }

      return {
        liabilityId: liability.id,
        name: liability.name,
        type: liability.type,
        creditor: liability.creditor,
        remainingAmount,
        monthlyPayment,
        interestRate,
        dueDate: liability.dueDate,
        daysUntilDue,
        isOverdue,
        urgencyLevel,
        estimatedNextPaymentDate,
        interestAccrued,
        lastPaymentDate:
          (liability as any).payments.length > 0
            ? (liability as any).payments[0].paymentDate
            : null,
        recommendations,
        notifications,
      };
    });

    // Sort by urgency
    const sortedReminders = reminders.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    });

    // Statistics
    const stats = {
      totalLiabilities: reminders.length,
      overdueLiabilities: reminders.filter((r) => r.isOverdue).length,
      criticalReminders: reminders.filter((r) => r.urgencyLevel === "critical")
        .length,
      highPriorityReminders: reminders.filter((r) => r.urgencyLevel === "high")
        .length,
      upcomingPaymentsIn7Days: reminders.filter(
        (r) =>
          r.daysUntilDue !== null && r.daysUntilDue >= 0 && r.daysUntilDue <= 7
      ).length,
      upcomingPaymentsIn30Days: reminders.filter(
        (r) =>
          r.daysUntilDue !== null && r.daysUntilDue >= 0 && r.daysUntilDue <= 30
      ).length,
      totalInterestAccrued: reminders.reduce(
        (sum, r) => sum + r.interestAccrued,
        0
      ),
    };

    // Categorize reminders
    const categorized = {
      overdue: sortedReminders.filter((r) => r.isOverdue),
      dueSoon: sortedReminders.filter(
        (r) => !r.isOverdue && r.daysUntilDue !== null && r.daysUntilDue <= 7
      ),
      upcoming: sortedReminders.filter(
        (r) =>
          !r.isOverdue &&
          r.daysUntilDue !== null &&
          r.daysUntilDue > 7 &&
          r.daysUntilDue <= daysAhead
      ),
      later: sortedReminders.filter(
        (r) => r.daysUntilDue !== null && r.daysUntilDue > daysAhead
      ),
    };

    return NextResponse.json({
      stats,
      categorized,
      allReminders: sortedReminders,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error in due date reminders:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
