import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Liability Creation Schema
 */
const CreateLiabilitySchema = z.object({
  name: z
    .string()
    .min(1, 'Nama hutang tidak boleh kosong')
    .max(200, 'Nama hutang maksimal 200 karakter')
    .trim(),
  type: z.enum(['MORTGAGE', 'CAR_LOAN', 'CREDIT_CARD', 'PERSONAL_LOAN', 'OTHER'], {
    errorMap: () => ({ message: 'Tipe hutang tidak valid' }),
  }),
  amount: z
    .number()
    .nonnegative('Jumlah hutang tidak boleh negatif')
    .max(999999999999, 'Jumlah hutang terlalu besar'),
  remainingAmount: z
    .number()
    .nonnegative('Sisa hutang tidak boleh negatif')
    .max(999999999999, 'Sisa hutang terlalu besar'),
  interestRate: z
    .number()
    .nonnegative('Suku bunga tidak boleh negatif')
    .max(100, 'Suku bunga maksimal 100%')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .optional()
    .nullable(),
  creditor: z
    .string()
    .max(200, 'Nama kreditor maksimal 200 karakter')
    .optional()
    .nullable(),
  startDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid' })
    .or(z.date())
    .optional()
    .nullable(),
  dueDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid' })
    .or(z.date())
    .optional()
    .nullable(),
});

type CreateLiabilityInput = z.infer<typeof CreateLiabilitySchema>;

/**
 * GET /api/liabilities
 * 
 * Get all liabilities for the current family
 */
export async function GET() {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Fetch liabilities
    const liabilities = await prisma.liability.findMany({
      where: {
        familyId: session.familyId!,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalAmount = liabilities.reduce((sum: number, liability: any) => sum + liability.amount, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalRemaining = liabilities.reduce((sum: number, liability: any) => sum + liability.remainingAmount, 0);
    const totalPaid = totalAmount - totalRemaining;

    return NextResponse.json({
      liabilities,
      summary: {
        total: liabilities.length,
        totalAmount,
        totalRemaining,
        totalPaid,
      },
    });
  } catch (error) {
    console.error('Get liabilities error:', error);

    // Handle authorization errors
    if (error instanceof Error && (error.message.includes('required') || error.message.includes('denied'))) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
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
        error: 'Terjadi kesalahan saat mengambil data hutang',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/liabilities
 * 
 * Create a new liability
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Parse and validate request body
    const body = await request.json();
    const validatedData: CreateLiabilityInput = CreateLiabilitySchema.parse(body);

    // Validate that remainingAmount <= amount
    if (validatedData.remainingAmount > validatedData.amount) {
      return NextResponse.json(
        {
          error: 'Sisa hutang tidak boleh lebih besar dari jumlah hutang',
          code: 'VALIDATION_ERROR',
          field: 'remainingAmount',
        },
        { status: 400 }
      );
    }

    // Convert date strings to Date objects if provided
    let startDate = undefined;
    if (validatedData.startDate) {
      startDate = typeof validatedData.startDate === 'string' 
        ? new Date(validatedData.startDate) 
        : validatedData.startDate;
    }

    let dueDate = undefined;
    if (validatedData.dueDate) {
      dueDate = typeof validatedData.dueDate === 'string' 
        ? new Date(validatedData.dueDate) 
        : validatedData.dueDate;
    }

    // Create liability
    const liability = await prisma.liability.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        amount: validatedData.amount,
        remainingAmount: validatedData.remainingAmount,
        interestRate: validatedData.interestRate,
        description: validatedData.description,
        creditor: validatedData.creditor,
        startDate,
        dueDate,
        familyId: session.familyId!,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_LIABILITY',
        entityType: 'Liability',
        entityId: liability.id,
        details: JSON.stringify(validatedData),
        userId: session.userId,
        familyId: session.familyId!,
      },
    });

    return NextResponse.json(
      {
        message: 'Hutang berhasil ditambahkan',
        liability,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create liability error:', error);

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
    if (error instanceof Error && (error.message.includes('required') || error.message.includes('denied'))) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
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
        error: 'Terjadi kesalahan saat menambahkan hutang',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
