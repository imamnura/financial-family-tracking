import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';

/**
 * Query Schema for Budget Status
 */
const BudgetStatusQuerySchema = z.object({
  month: z.string().regex(/^\d{1,2}$/, 'Month harus 1-12').transform(Number),
  year: z.string().regex(/^\d{4}$/, 'Year harus 4 digit').transform(Number),
});

/**
 * GET /api/budget/status
 * 
 * Get budget status for all categories in a specific month/year
 * Returns categories with their budget and actual spending (realization)
 * 
 * Query params:
 * - month: 1-12
 * - year: YYYY (e.g., 2025)
 * 
 * Response:
 * {
 *   month: 10,
 *   year: 2025,
 *   categories: [
 *     {
 *       id: string,
 *       name: string,
 *       type: string,
 *       budget: number | null,
 *       budgetId: string | null,
 *       realization: number,
 *       percentage: number,
 *       status: 'over' | 'warning' | 'safe' | 'no-budget'
 *     }
 *   ],
 *   totalBudget: number,
 *   totalRealization: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = BudgetStatusQuerySchema.safeParse({
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Parameter tidak valid',
          details: queryResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { month, year } = queryResult.data;

    // Validate month range
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month harus antara 1-12' },
        { status: 400 }
      );
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    // Fetch all categories for the family
    const categories = await prisma.category.findMany({
      where: {
        familyId: session.familyId!,
      },
      select: {
        id: true,
        name: true,
        type: true,
        icon: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Fetch budgets for this month/year
    const budgets = await prisma.budget.findMany({
      where: {
        familyId: session.familyId!,
        month,
        year,
      },
      select: {
        id: true,
        categoryId: true,
        amount: true,
      },
    });

    // Create budget lookup map
    const budgetMap = new Map<string, { id: string; amount: number }>(
      budgets.map((b: { id: string; categoryId: string; amount: number }) => [
        b.categoryId,
        { id: b.id, amount: b.amount },
      ])
    );

    // Fetch transaction totals per category for the month
    const transactionTotals = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        familyId: session.familyId!,
        type: 'EXPENSE', // Only count expenses for budget tracking
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Create realization lookup map
    const realizationMap = new Map<string, number>(
      transactionTotals.map((t: { categoryId: string | null; _sum: { amount: number | null } }) => [
        t.categoryId!,
        t._sum.amount || 0,
      ])
    );

    // Combine data
    interface CategoryWithBudget {
      id: string;
      name: string;
      type: string;
      icon: string | null;
      budget: number | null;
      budgetId: string | null;
      realization: number;
      percentage: number;
      actualPercentage: number;
      status: 'over' | 'warning' | 'safe' | 'no-budget';
    }

    const categoriesWithBudget: CategoryWithBudget[] = categories.map((category: {
      id: string;
      name: string;
      type: string;
      icon: string | null;
    }) => {
      const budgetData = budgetMap.get(category.id);
      const budget = budgetData?.amount || null;
      const budgetId = budgetData?.id || null;
      const realization = realizationMap.get(category.id) || 0;

      // Calculate percentage and status
      let percentage = 0;
      let status: 'over' | 'warning' | 'safe' | 'no-budget' = 'no-budget';

      if (budget !== null && budget > 0) {
        percentage = (realization / budget) * 100;
        
        if (percentage >= 100) {
          status = 'over';
        } else if (percentage >= 80) {
          status = 'warning';
        } else {
          status = 'safe';
        }
      }

      return {
        id: category.id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        budget,
        budgetId,
        realization,
        percentage: Math.min(percentage, 100), // Cap at 100 for display
        actualPercentage: percentage, // Keep actual value for logic
        status,
      };
    });

    // Calculate totals
    const totalBudget = categoriesWithBudget.reduce(
      (sum: number, cat) => sum + (cat.budget || 0),
      0
    );
    const totalRealization = categoriesWithBudget.reduce(
      (sum: number, cat) => sum + cat.realization,
      0
    );

    return NextResponse.json({
      month,
      year,
      categories: categoriesWithBudget,
      totalBudget,
      totalRealization,
      totalPercentage: totalBudget > 0 ? (totalRealization / totalBudget) * 100 : 0,
    });
  } catch (error) {
    console.error('Get budget status error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil status budget' },
      { status: 500 }
    );
  }
}
