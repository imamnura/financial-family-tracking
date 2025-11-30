import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { getMonthInt } from "@/lib/date-helpers";

/**
 * GET /api/reports/monthly
 * Get comprehensive monthly financial report
 * Query params:
 * - year: number
 * - month: number (1-12)
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
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString()
    );
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString()
    );

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get income summary
    const income = await prisma.transaction.aggregate({
      where: {
        familyId: user.familyId,
        type: "INCOME",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get expense summary
    const expense = await prisma.transaction.aggregate({
      where: {
        familyId: user.familyId,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get expense by category
    const expenseByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        familyId: user.familyId,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const categoriesWithData = await Promise.all(
      expenseByCategory.map(async (item) => {
        const category = item.categoryId
          ? await prisma.category.findUnique({ where: { id: item.categoryId } })
          : null;

        return {
          categoryId: item.categoryId,
          categoryName: category?.name || "Uncategorized",
          amount: item._sum.amount,
          count: item._count,
          percentage:
            Number(expense._sum.amount) > 0
              ? (Number(item._sum.amount) / Number(expense._sum.amount)) * 100
              : 0,
        };
      })
    );

    // Get income by category
    const incomeByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        familyId: user.familyId,
        type: "INCOME",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const incomeCategoriesWithData = await Promise.all(
      incomeByCategory.map(async (item) => {
        const category = item.categoryId
          ? await prisma.category.findUnique({ where: { id: item.categoryId } })
          : null;

        return {
          categoryId: item.categoryId,
          categoryName: category?.name || "Uncategorized",
          amount: item._sum.amount,
          count: item._count,
        };
      })
    );

    // Get daily trends
    const transactions = await prisma.transaction.findMany({
      where: {
        familyId: user.familyId,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        type: true,
        amount: true,
      },
      orderBy: { date: "asc" },
    });

    // Group by day
    const dailyData: Record<
      string,
      { income: number; expense: number; net: number }
    > = {};

    transactions.forEach((tx) => {
      const day = tx.date.toISOString().split("T")[0];
      if (!dailyData[day]) {
        dailyData[day] = { income: 0, expense: 0, net: 0 };
      }

      if (tx.type === "INCOME") {
        dailyData[day].income += Number(tx.amount);
      } else if (tx.type === "EXPENSE") {
        dailyData[day].expense += Number(tx.amount);
      }

      dailyData[day].net = dailyData[day].income - dailyData[day].expense;
    });

    // Get budget comparison
    const monthInt = getMonthInt(startDate);
    const budgets = await prisma.budget.findMany({
      where: {
        familyId: user.familyId!,
        month: monthInt,
        year: year,
      },
      include: {
        category: true,
      },
    });

    const budgetComparison = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            familyId: user.familyId!,
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        const spentAmount = Number(spent._sum?.amount || 0);
        const budgetAmount = Number(budget.amount);
        const remaining = budgetAmount - spentAmount;
        const percentage = (spentAmount / budgetAmount) * 100;

        return {
          categoryId: budget.categoryId,
          categoryName: budget.category?.name || "Uncategorized",
          budget: budgetAmount,
          spent: spentAmount,
          remaining,
          percentage,
          status:
            percentage > 100 ? "over" : percentage > 80 ? "warning" : "ok",
        };
      })
    );

    // Get wallet balances
    const wallets = await prisma.wallet.findMany({
      where: { familyId: user.familyId },
      select: {
        id: true,
        name: true,
        balance: true,
        type: true,
      },
    });

    // Calculate totals
    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Get top expenses
    const topExpenses = await prisma.transaction.findMany({
      where: {
        familyId: user.familyId,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      include: {
        category: true,
      },
      orderBy: { amount: "desc" },
      take: 10,
    });

    return NextResponse.json({
      period: {
        year,
        month,
        startDate,
        endDate,
      },
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        incomeTransactions: income._count,
        expenseTransactions: expense._count,
      },
      categoryBreakdown: {
        expenses: categoriesWithData.sort(
          (a, b) => Number(b.amount) - Number(a.amount)
        ),
        income: incomeCategoriesWithData.sort(
          (a, b) => Number(b.amount) - Number(a.amount)
        ),
      },
      dailyTrends: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data,
      })),
      budgetComparison,
      wallets,
      topExpenses: topExpenses.map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: tx.category?.name || "Uncategorized",
      })),
    });
  } catch (error) {
    console.error("[Monthly Report] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get report",
      },
      { status: 500 }
    );
  }
}
