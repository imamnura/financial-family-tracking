import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';
import { sendBudgetWarningEmail } from '@/lib/email';

/**
 * Transaction Creation Schema
 */
const CreateTransactionSchema = z.object({
  amount: z
    .number()
    .positive('Jumlah harus lebih dari 0')
    .max(999999999999, 'Jumlah terlalu besar'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'Tipe harus INCOME atau EXPENSE' }),
  }),
  description: z
    .string()
    .min(1, 'Deskripsi tidak boleh kosong')
    .max(500, 'Deskripsi maksimal 500 karakter')
    .trim(),
  date: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid' })
    .or(z.date()),
  categoryId: z.string().uuid('Category ID tidak valid'),
  walletId: z.string().uuid('Wallet ID tidak valid'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
});

type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

/**
 * GET /api/transactions
 * 
 * Get all transactions for the user's family
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/transactions');
 * const data = await response.json();
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Get query parameters for filtering (optional)
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | null;
    const categoryId = searchParams.get('categoryId');
    const walletId = searchParams.get('walletId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      familyId: session.familyId!,
    };

    if (type) {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (walletId) {
      where.walletId = walletId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Fetch transactions with relations
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            type: true,
          },
        },
        wallet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: Math.min(limit, 100), // Max 100 transactions
    });

    // Calculate summary
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      count: transactions.length,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions.forEach((transaction: any) => {
      if (transaction.type === 'INCOME') {
        summary.totalIncome += transaction.amount;
      } else if (transaction.type === 'EXPENSE') {
        summary.totalExpense += transaction.amount;
      }
    });

    summary.balance = summary.totalIncome - summary.totalExpense;

    return NextResponse.json({
      transactions,
      summary,
    });
  } catch (error) {
    console.error('Get transactions error:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Terjadi kesalahan saat mengambil data transaksi',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions
 * 
 * Create a new transaction and update wallet balance
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/transactions', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     amount: 50000,
 *     type: 'EXPENSE',
 *     description: 'Makan siang',
 *     date: new Date().toISOString(),
 *     categoryId: 'category-id',
 *     walletId: 'wallet-id'
 *   })
 * });
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Parse and validate request body
    const body = await request.json();
    const validatedData: CreateTransactionInput = CreateTransactionSchema.parse(body);

    const { amount, type, description, date, categoryId, walletId, notes } = validatedData;

    // Convert date string to Date object if needed
    const transactionDate = typeof date === 'string' ? new Date(date) : date;

    // Create transaction and update wallet balance in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Verify wallet belongs to user's family
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
        select: { id: true, familyId: true, balance: true },
      });

      if (!wallet) {
        throw new Error('Wallet tidak ditemukan');
      }

      if (wallet.familyId !== session.familyId) {
        throw new Error('Wallet tidak milik keluarga Anda');
      }

      // 2. Verify category belongs to user's family
      const category = await tx.category.findUnique({
        where: { id: categoryId },
        select: { id: true, familyId: true, type: true },
      });

      if (!category) {
        throw new Error('Kategori tidak ditemukan');
      }

      if (category.familyId !== session.familyId) {
        throw new Error('Kategori tidak milik keluarga Anda');
      }

      // 3. Validate category type matches transaction type
      if (category.type !== type) {
        throw new Error(`Kategori ini untuk ${category.type}, bukan ${type}`);
      }

      // 4. Calculate new wallet balance
      let newBalance = wallet.balance;
      if (type === 'INCOME') {
        newBalance += amount;
      } else if (type === 'EXPENSE') {
        newBalance -= amount;
      }

      // Check if wallet has sufficient balance for expenses
      if (type === 'EXPENSE' && newBalance < 0) {
        throw new Error('Saldo wallet tidak mencukupi');
      }

      // 5. Create transaction
      const transaction = await tx.transaction.create({
        data: {
          amount,
          type,
          description,
          date: transactionDate,
          notes: notes || null,
          categoryId,
          walletId,
          userId: session.userId,
          familyId: session.familyId!,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              type: true,
            },
          },
          wallet: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 6. Update wallet balance
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: newBalance },
      });

      // 7. Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE_TRANSACTION',
          entityType: 'Transaction',
          entityId: transaction.id,
          details: JSON.stringify({
            type,
            amount,
            description,
            oldBalance: wallet.balance,
            newBalance,
          }),
          userId: session.userId,
          familyId: session.familyId!,
        },
      });

      return {
        transaction,
        wallet: {
          id: walletId,
          oldBalance: wallet.balance,
          newBalance,
        },
      };
    });

    // 8. Check budget warning (async, non-blocking)
    // Only for EXPENSE transactions
    if (type === 'EXPENSE') {
      // Don't await - run in background to not block response
      checkBudgetWarning(
        session.familyId!,
        session.userId,
        categoryId,
        transactionDate
      ).catch((err: Error) => {
        console.error('Budget warning check failed:', err);
      });
    }

    return NextResponse.json(
      {
        message: 'Transaksi berhasil dibuat',
        transaction: result.transaction,
        wallet: result.wallet,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create transaction error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          error: firstError.message,
          code: 'VALIDATION_ERROR',
          field: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    // Handle authorization errors
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (
        error.message.includes('tidak ditemukan') ||
        error.message.includes('tidak milik') ||
        error.message.includes('tidak mencukupi') ||
        error.message.includes('Kategori ini untuk')
      ) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'BUSINESS_LOGIC_ERROR',
          },
          { status: 400 }
        );
      }
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = PrismaErrorHandler.handle(error);
      return NextResponse.json(
        {
          error: prismaError.message,
          code: prismaError.code,
        },
        { status: 400 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        error: 'Terjadi kesalahan saat membuat transaksi',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * Check budget warning and send email notification
 * This runs asynchronously after transaction is created
 */
async function checkBudgetWarning(
  familyId: string,
  userId: string,
  categoryId: string,
  transactionDate: Date
) {
  try {
    // Get month and year from transaction date
    const month = transactionDate.getMonth() + 1; // 1-12
    const year = transactionDate.getFullYear();

    // Get start and end date for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Get total expenses for this category in current month
    const totalExpenses = await prisma.transaction.aggregate({
      where: {
        familyId,
        categoryId,
        type: 'EXPENSE',
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const currentSpent = totalExpenses._sum.amount || 0;

    // 2. Get budget for this category and month
    const budget = await prisma.budget.findFirst({
      where: {
        familyId,
        categoryId,
        month,
        year,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    // If no budget set, skip notification
    if (!budget) {
      return;
    }

    // 3. Calculate percentage
    const percentage = (currentSpent / Number(budget.amount)) * 100;

    // 4. Send warning email if spent >= 90% of budget
    if (percentage >= 90) {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
        },
      });

      if (!user?.email) {
        console.warn('User email not found for budget warning');
        return;
      }

      // Send warning email (non-blocking)
      await sendBudgetWarningEmail(
        user.email,
        user.name,
        budget.category.name,
        Number(budget.amount),
        currentSpent,
        percentage
      );

      console.log(
        `📧 Budget warning sent to ${user.email} for category ${budget.category.name} (${percentage.toFixed(1)}%)`
      );
    }
  } catch (error) {
    console.error('Error in checkBudgetWarning:', error);
    // Don't throw - this is a background task
  }
}
