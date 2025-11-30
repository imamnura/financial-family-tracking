import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { sendEmail as sendEmailNotification } from "@/lib/email";
import { getMonthInt, getMonthDateRange } from "@/lib/date-helpers";

/**
 * POST /api/notifications/send-monthly-summary
 * Send monthly financial summary
 * Query params:
 * - month: YYYYMM (optional, default: current month)
 * - sendEmail: boolean (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authUser = await verifyToken(token);
    if (!authUser || !authUser.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    // Fetch full user data
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, name: true, email: true, familyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const sendEmail = searchParams.get("sendEmail") !== "false";

    const familyId = user.familyId!;

    // Determine month
    const monthInt = monthParam
      ? parseInt(monthParam)
      : getMonthInt(new Date());
    const { start: monthStart, end: monthEnd } = getMonthDateRange(monthInt);

    const monthName = monthStart.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    // Fetch transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        familyId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        category: true,
      },
    });

    // Calculate totals
    const income = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    // Category breakdown
    const categoryTotals: Record<
      string,
      { name: string; amount: number; count: number }
    > = {};
    const totalExpense = expense;

    transactions
      .filter((t) => t.type === "EXPENSE")
      .forEach((t) => {
        const categoryName = t.category?.name || "Uncategorized";
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = {
            name: categoryName,
            amount: 0,
            count: 0,
          };
        }
        categoryTotals[categoryName].amount += Number(t.amount);
        categoryTotals[categoryName].count++;
      });

    const topCategories = Object.values(categoryTotals)
      .map((cat) => ({
        name: cat.name,
        amount: cat.amount,
        percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
        count: cat.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Budget performance
    const budgets = await prisma.budget.findMany({
      where: {
        familyId,
        month: monthInt,
      },
      include: {
        category: true,
      },
    });

    let totalBudget = 0;
    let totalSpent = 0;

    budgets.forEach((budget) => {
      totalBudget += Number(budget.amount);
      const categoryExpense =
        categoryTotals[budget.category?.name || ""]?.amount || 0;
      totalSpent += categoryExpense;
    });

    const budgetPerformance =
      totalBudget > 0 ? (1 - totalSpent / totalBudget) * 100 : 0;

    // Goals progress
    const goals = await prisma.goal.findMany({
      where: {
        familyId,
        status: "ACTIVE",
      },
      include: {
        contributions: {
          where: {
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        },
      },
    });

    const goalsData = goals.map((goal) => {
      const currentAmount = Number(goal.currentAmount);
      const targetAmount = Number(goal.targetAmount);
      const progress =
        targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

      return {
        name: goal.name,
        progress,
        target: targetAmount,
        current: currentAmount,
      };
    });

    // Create notification
    const title = `📊 Monthly Report - ${monthName}`;
    const message = `Income: Rp ${income.toLocaleString(
      "id-ID"
    )} | Expenses: Rp ${expense.toLocaleString(
      "id-ID"
    )} | Savings Rate: ${savingsRate.toFixed(1)}%`;

    const notification = await prisma.notification.create({
      data: {
        type: "MONTHLY_SUMMARY",
        title,
        message,
        data: {
          month: monthName,
          monthInt,
          totalIncome: income,
          totalExpense: expense,
          savingsRate,
          budgetPerformance,
          transactionCount: transactions.length,
          topCategories: topCategories.slice(0, 5),
          goals: goalsData.slice(0, 3),
        },
        userId: user.id,
        familyId,
        status: "SENT",
      },
    });

    // Send email
    let emailSent = false;
    if (sendEmail && user.email) {
      const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">📊 Monthly Financial Report</h2>
    <p style="margin: 5px 0 0 0;">${monthName}</p>
  </div>
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Here's your comprehensive financial report for ${monthName}:</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Income</div>
        <div style="font-size: 20px; font-weight: bold; color: #059669; margin-top: 5px;">Rp ${income.toLocaleString(
          "id-ID"
        )}</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Expenses</div>
        <div style="font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 5px;">Rp ${expense.toLocaleString(
          "id-ID"
        )}</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Savings Rate</div>
        <div style="font-size: 20px; font-weight: bold; color: #3b82f6; margin-top: 5px;">${savingsRate.toFixed(
          1
        )}%</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Budget Performance</div>
        <div style="font-size: 20px; font-weight: bold; color: ${
          budgetPerformance >= 80 ? "#059669" : "#f59e0b"
        }; margin-top: 5px;">${budgetPerformance.toFixed(1)}%</div>
      </div>
    </div>
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p><strong>💰 Spending by Category</strong></p>
      ${topCategories
        .slice(0, 5)
        .map(
          (cat) => `
        <div style="margin: 10px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span>${cat.name}</span>
            <span><strong>Rp ${cat.amount.toLocaleString(
              "id-ID"
            )}</strong> (${cat.percentage.toFixed(1)}%)</span>
          </div>
          <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 5px;">
            <div style="height: 100%; width: ${cat.percentage}%; background: ${
            cat.percentage > 30
              ? "#dc2626"
              : cat.percentage > 20
              ? "#f59e0b"
              : "#10b981"
          };"></div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    ${
      goalsData.length > 0
        ? `
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p><strong>🎯 Goal Progress</strong></p>
      ${goalsData
        .slice(0, 3)
        .map(
          (goal) => `
        <div style="margin: 10px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span>${goal.name}</span>
            <span><strong>${goal.progress.toFixed(1)}%</strong></span>
          </div>
          <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 5px;">
            <div style="height: 100%; width: ${
              goal.progress
            }%; background: #10b981;"></div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    `
        : ""
    }
    <p>Great job tracking your finances! Keep it up! 🎉</p>
  </div>
</div>
      `;

      const emailResult = await sendEmailNotification({
        to: user.email,
        subject: title,
        html: emailHtml,
        text: message,
      });

      emailSent = emailResult.success;

      if (emailResult.success) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            emailSent: true,
            emailSentAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      notification,
      emailSent,
      summary: {
        month: monthName,
        monthInt,
        income,
        expense,
        savingsRate,
        budgetPerformance,
        transactionCount: transactions.length,
        topCategories: topCategories.slice(0, 10),
        goals: goalsData,
        budgetCount: budgets.length,
      },
      message: "Monthly summary sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending monthly summary:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
