import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { sendEmail as sendEmailNotification } from "@/lib/email";

/**
 * POST /api/notifications/send-weekly-summary
 * Send weekly financial summary
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
    const sendEmail = searchParams.get("sendEmail") !== "false";

    const familyId = user.familyId!;

    // Calculate week range (last 7 days)
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // Fetch transactions for the week
    const transactions = await prisma.transaction.findMany({
      where: {
        familyId,
        date: {
          gte: weekStart,
          lte: weekEnd,
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

    const netCashFlow = income - expense;

    // Group by category
    const categoryTotals: Record<
      string,
      { name: string; amount: number; count: number }
    > = {};

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

    // Get top 5 categories
    const topCategories = Object.values(categoryTotals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Create notification
    const title = `📈 Weekly Summary (${weekStart.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })} - ${weekEnd.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })})`;

    const message = `Income: Rp ${income.toLocaleString(
      "id-ID"
    )} | Expenses: Rp ${expense.toLocaleString("id-ID")} | Net: ${
      netCashFlow >= 0 ? "+" : ""
    }Rp ${Math.abs(netCashFlow).toLocaleString("id-ID")}`;

    const notification = await prisma.notification.create({
      data: {
        type: "WEEKLY_SUMMARY",
        title,
        message,
        data: {
          weekStart,
          weekEnd,
          totalIncome: income,
          totalExpense: expense,
          netCashFlow,
          transactionCount: transactions.length,
          topCategories,
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
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">📈 Weekly Financial Summary</h2>
    <p style="margin: 5px 0 0 0;">${weekStart.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })} - ${weekEnd.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}</p>
  </div>
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Here's your financial summary for the past week:</p>
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
      <p><strong>Total Income</strong></p>
      <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 5px 0;">Rp ${income.toLocaleString(
        "id-ID"
      )}</p>
    </div>
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
      <p><strong>Total Expenses</strong></p>
      <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 5px 0;">Rp ${expense.toLocaleString(
        "id-ID"
      )}</p>
    </div>
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
      <p><strong>Net Cash Flow</strong></p>
      <p style="font-size: 24px; font-weight: bold; color: ${
        netCashFlow >= 0 ? "#059669" : "#dc2626"
      }; margin: 5px 0;">
        ${netCashFlow >= 0 ? "+" : ""}Rp ${Math.abs(netCashFlow).toLocaleString(
        "id-ID"
      )}
      </p>
    </div>
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p><strong>📊 Top Spending Categories</strong></p>
      ${topCategories
        .map(
          (cat) => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span>${cat.name}</span>
          <span><strong>Rp ${cat.amount.toLocaleString("id-ID")}</strong></span>
        </div>
      `
        )
        .join("")}
    </div>
    <p>You made <strong>${
      transactions.length
    }</strong> transactions this week.</p>
    <p>Keep up the good work managing your finances! 💪</p>
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
        period: {
          start: weekStart,
          end: weekEnd,
        },
        income,
        expense,
        netCashFlow,
        transactionCount: transactions.length,
        topCategories,
      },
      message: "Weekly summary sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending weekly summary:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
