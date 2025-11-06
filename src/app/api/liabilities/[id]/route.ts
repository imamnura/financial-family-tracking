import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily, validateFamilyAccess } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Liability Update Schema
 */
const UpdateLiabilitySchema = z.object({
  name: z
    .string()
    .min(1, 'Nama hutang tidak boleh kosong')
    .max(200, 'Nama hutang maksimal 200 karakter')
    .trim()
    .optional(),
  type: z
    .enum(['MORTGAGE', 'CAR_LOAN', 'CREDIT_CARD', 'PERSONAL_LOAN', 'OTHER'], {
      errorMap: () => ({ message: 'Tipe hutang tidak valid' }),
    })
    .optional(),
  amount: z
    .number()
    .nonnegative('Jumlah hutang tidak boleh negatif')
    .max(999999999999, 'Jumlah hutang terlalu besar')
    .optional(),
  remainingAmount: z
    .number()
    .nonnegative('Sisa hutang tidak boleh negatif')
    .max(999999999999, 'Sisa hutang terlalu besar')
    .optional(),
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

type UpdateLiabilityInput = z.infer<typeof UpdateLiabilitySchema>;

/**
 * PUT /api/liabilities/[id]
 * 
 * Update a liability
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    const { id } = params;

    // Find liability
    const liability = await prisma.liability.findUnique({
      where: { id },
      select: { id: true, familyId: true, amount: true, remainingAmount: true },
    });

    if (!liability) {
      return NextResponse.json(
        {
          error: 'Hutang tidak ditemukan',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate family access
    await validateFamilyAccess(session, liability.familyId);

    // Parse and validate request body
    const body = await request.json();
    const validatedData: UpdateLiabilityInput = UpdateLiabilitySchema.parse(body);

    // Validate that remainingAmount <= amount
    const newAmount = validatedData.amount ?? liability.amount;
    const newRemainingAmount = validatedData.remainingAmount ?? liability.remainingAmount;
    
    if (newRemainingAmount > newAmount) {
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
    if (validatedData.startDate !== undefined) {
      if (validatedData.startDate === null) {
        startDate = null;
      } else if (typeof validatedData.startDate === 'string') {
        startDate = new Date(validatedData.startDate);
      } else {
        startDate = validatedData.startDate;
      }
    }

    let dueDate = undefined;
    if (validatedData.dueDate !== undefined) {
      if (validatedData.dueDate === null) {
        dueDate = null;
      } else if (typeof validatedData.dueDate === 'string') {
        dueDate = new Date(validatedData.dueDate);
      } else {
        dueDate = validatedData.dueDate;
      }
    }

    // Update liability
    const updatedLiability = await prisma.liability.update({
      where: { id },
      data: {
        ...validatedData,
        startDate,
        dueDate,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_LIABILITY',
        entityType: 'Liability',
        entityId: id,
        details: JSON.stringify(validatedData),
        userId: session.userId,
        familyId: session.familyId!,
      },
    });

    return NextResponse.json({
      message: 'Hutang berhasil diperbarui',
      liability: updatedLiability,
    });
  } catch (error) {
    console.error('Update liability error:', error);

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
        error: 'Terjadi kesalahan saat memperbarui hutang',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/liabilities/[id]
 * 
 * Delete a liability
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    const { id } = params;

    // Find liability
    const liability = await prisma.liability.findUnique({
      where: { id },
      select: { id: true, familyId: true, name: true, amount: true, remainingAmount: true },
    });

    if (!liability) {
      return NextResponse.json(
        {
          error: 'Hutang tidak ditemukan',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate family access
    await validateFamilyAccess(session, liability.familyId);

    // Delete liability
    await prisma.liability.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_LIABILITY',
        entityType: 'Liability',
        entityId: id,
        details: JSON.stringify({
          name: liability.name,
          amount: liability.amount,
          remainingAmount: liability.remainingAmount,
        }),
        userId: session.userId,
        familyId: session.familyId!,
      },
    });

    return NextResponse.json({
      message: 'Hutang berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete liability error:', error);

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
        error: 'Terjadi kesalahan saat menghapus hutang',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
