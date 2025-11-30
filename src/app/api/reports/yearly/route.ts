import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/reports/yearly
 * Get comprehensive yearly financial report
 * Query params:
 * - year: number
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

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get yearly summary
    const income = await prisma.transaction.aggregate({
      where: {
        familyId: user.familyId,
        type: "INCOME",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const expense = await prisma.transaction.aggregate({
      where: {
        familyId: user.familyId,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get monthly breakdown
    const monthlyData = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const monthStart = new Date(year, i, 1);
        const monthEnd = new Date(year, i + 1, 0, 23, 59, 59);

        const monthIncome = await prisma.transaction.aggregate({
          where: {
            familyId: user.familyId!,
            type: "INCOME",
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        });

        const monthExpense = await prisma.transaction.aggregate({
          where: {
            familyId: user.familyId!,
            type: "EXPENSE",
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        });

        const incomeAmount = Number(monthIncome._sum?.amount || 0);
        const expenseAmount = Number(monthExpense._sum?.amount || 0);
        const net = incomeAmount - expenseAmount;

        return {
          month: i + 1,
          monthName: new Date(year, i, 1).toLocaleDateString("id-ID", {
            month: "long",
          }),
          income: incomeAmount,
          expense: expenseAmount,
          net,
          savingsRate: incomeAmount > 0 ? (net / incomeAmount) * 100 : 0,
        };
      })
    );

    // Get category breakdown for the year
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

    // Get quarterly summary
    const quarters = await Promise.all(
      [0, 3, 6, 9].map(async (startMonth, index) => {
        const qStart = new Date(year, startMonth, 1);
        const qEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);

        const qIncome = await prisma.transaction.aggregate({
          where: {
            familyId: user.familyId!,
            type: "INCOME",
            date: { gte: qStart, lte: qEnd },
          },
          _sum: { amount: true },
        });

        const qExpense = await prisma.transaction.aggregate({
          where: {
            familyId: user.familyId!,
            type: "EXPENSE",
            date: { gte: qStart, lte: qEnd },
          },
          _sum: { amount: true },
        });

        const incomeAmount = Number(qIncome._sum?.amount || 0);
        const expenseAmount = Number(qExpense._sum?.amount || 0);

        return {
          quarter: index + 1,
          income: incomeAmount,
          expense: expenseAmount,
          net: incomeAmount - expenseAmount,
        };
      })
    );

    // Get goals progress
    const goals = await prisma.goal.findMany({
      where: {
        familyId: user.familyId!,
        OR: [
          { deadline: { gte: startDate, lte: endDate } },
          { status: "ACTIVE" },
        ],
      },
      include: {
        _count: {
          select: { contributions: true },
        },
      },
    });

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const contributions = await prisma.goalContribution.aggregate({
          where: { goalId: goal.id },
          _sum: { amount: true },
        });

        const totalContributed = Number(contributions._sum.amount || 0);
        const progress = (totalContributed / Number(goal.targetAmount)) * 100;

        return {
          id: goal.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: totalContributed,
          progress,
          deadline: goal.deadline,
          status: goal.status,
        };
      })
    );

    // Calculate totals and averages
    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const avgMonthlyIncome = totalIncome / 12;
    const avgMonthlyExpense = totalExpense / 12;

    // Get wallet summary
    const wallets = await prisma.wallet.findMany({
      where: { familyId: user.familyId },
      select: {
        id: true,
        name: true,
        balance: true,
        type: true,
      },
    });

    const totalBalance = wallets.reduce(
      (sum, wallet) => sum + Number(wallet.balance),
      0
    );

    // Get top expenses of the year
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
      take: 20,
    });

    return NextResponse.json({
      year,
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        avgMonthlyIncome,
        avgMonthlyExpense,
        totalBalance,
        incomeTransactions: income._count,
        expenseTransactions: expense._count,
      },
      monthlyBreakdown: monthlyData,
      quarterlyBreakdown: quarters,
      categoryBreakdown: {
        expenses: categoriesWithData.sort(
          (a, b) => Number(b.amount) - Number(a.amount)
        ),
        income: incomeCategoriesWithData.sort(
          (a, b) => Number(b.amount) - Number(a.amount)
        ),
      },
      goals: goalsWithProgress,
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
    console.error("[Yearly Report] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get report",
      },
      { status: 500 }
    );
  }
}
