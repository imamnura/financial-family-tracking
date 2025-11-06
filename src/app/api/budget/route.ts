import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Budget Create/Update Schema
 */
const BudgetSchema = z.object({
  categoryId: z.string().uuid('Category ID tidak valid'),
  amount: z
    .number()
    .nonnegative('Jumlah budget tidak boleh negatif')
    .max(999999999999, 'Jumlah budget terlalu besar'),
  month: z
    .number()
    .int('Month harus bilangan bulat')
    .min(1, 'Month minimal 1')
    .max(12, 'Month maksimal 12'),
  year: z
    .number()
    .int('Year harus bilangan bulat')
    .min(2000, 'Year minimal 2000')
    .max(2100, 'Year maksimal 2100'),
});

type BudgetInput = z.infer<typeof BudgetSchema>;

/**
 * POST /api/budget
 * 
 * Create or update budget for a category in a specific month/year
 * 
 * Request body:
 * {
 *   categoryId: string,
 *   amount: number,
 *   month: number (1-12),
 *   year: number (e.g., 2025)
 * }
 * 
 * Response:
 * {
 *   budget: {
 *     id: string,
 *     categoryId: string,
 *     amount: number,
 *     month: number,
 *     year: number,
 *     ...
 *   },
 *   created: boolean (true if new, false if updated)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Check if user is ADMIN
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'Akses ditolak',
          message: 'Hanya admin yang dapat mengelola budget',
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData: BudgetInput = BudgetSchema.parse(body);

    const { categoryId, amount, month, year } = validatedData;

    // Verify category belongs to user's family
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, familyId: true, name: true, type: true },
    });

    if (!category) {
      return NextResponse.json(
        {
          error: 'Kategori tidak ditemukan',
          code: 'CATEGORY_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (category.familyId !== session.familyId) {
      return NextResponse.json(
        {
          error: 'Kategori tidak ditemukan dalam keluarga Anda',
          code: 'CATEGORY_NOT_IN_FAMILY',
        },
        { status: 403 }
      );
    }

    // Check if budget already exists
    const existingBudget = await prisma.budget.findFirst({
      where: {
        familyId: session.familyId!,
        categoryId,
        month,
        year,
      },
    });

    let budget;
    let created = false;

    if (existingBudget) {
      // Update existing budget
      budget = await prisma.budget.update({
        where: { id: existingBudget.id },
        data: {
          amount,
          updatedAt: new Date(),
        },
        include: {
          category: {
            select: {
              name: true,
              type: true,
              icon: true,
            },
          },
        },
      });
    } else {
      // Create new budget
      budget = await prisma.budget.create({
        data: {
          familyId: session.familyId!,
          categoryId,
          amount,
          month,
          year,
          createdById: session.userId,
        },
        include: {
          category: {
            select: {
              name: true,
              type: true,
              icon: true,
            },
          },
        },
      });
      created = true;
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        familyId: session.familyId!,
        action: created ? 'CREATE_BUDGET' : 'UPDATE_BUDGET',
        entityType: 'Budget',
        entityId: budget.id,
        changes: JSON.stringify({
          categoryId,
          categoryName: category.name,
          amount,
          month,
          year,
          previousAmount: existingBudget?.amount || null,
        }),
      },
    });

    return NextResponse.json(
      {
        budget,
        created,
        message: created
          ? 'Budget berhasil dibuat'
          : 'Budget berhasil diperbarui',
      },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error('Create/update budget error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    const prismaError = PrismaErrorHandler.handle(error);
    if (prismaError.code !== 'UNKNOWN') {
      return NextResponse.json(
        {
          error: prismaError.message,
          code: prismaError.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyimpan budget' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/budget
 * 
 * Get all budgets for the family
 * Optional query params: month, year
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build where clause
    const where: {
      familyId: string;
      month?: number;
      year?: number;
    } = {
      familyId: session.familyId!,
    };

    if (month) {
      const monthNum = parseInt(month);
      if (monthNum >= 1 && monthNum <= 12) {
        where.month = monthNum;
      }
    }

    if (year) {
      const yearNum = parseInt(year);
      if (yearNum >= 2000 && yearNum <= 2100) {
        where.year = yearNum;
      }
    }

    // Fetch budgets
    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            type: true,
            icon: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { category: { name: 'asc' } }],
    });

    return NextResponse.json({
      budgets,
      count: budgets.length,
    });
  } catch (error) {
    console.error('Get budgets error:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil budget' },
      { status: 500 }
    );
  }
}
