import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily, validateFamilyAccess } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Asset Update Schema
 */
const UpdateAssetSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama aset tidak boleh kosong')
    .max(200, 'Nama aset maksimal 200 karakter')
    .trim()
    .optional(),
  type: z
    .enum(['PROPERTY', 'VEHICLE', 'SAVINGS', 'INVESTMENT', 'OTHER'], {
      errorMap: () => ({ message: 'Tipe aset tidak valid' }),
    })
    .optional(),
  value: z
    .number()
    .nonnegative('Nilai aset tidak boleh negatif')
    .max(999999999999, 'Nilai aset terlalu besar')
    .optional(),
  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .optional(),
  acquisitionDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid' })
    .or(z.date())
    .optional()
    .nullable(),
});

type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

/**
 * PUT /api/assets/[id]
 * 
 * Update an asset
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

    // Find asset
    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, familyId: true },
    });

    if (!asset) {
      return NextResponse.json(
        {
          error: 'Aset tidak ditemukan',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate family access
    await validateFamilyAccess(session, asset.familyId);

    // Parse and validate request body
    const body = await request.json();
    const validatedData: UpdateAssetInput = UpdateAssetSchema.parse(body);

    // Convert date string to Date object if provided
    let acquisitionDate = undefined;
    if (validatedData.acquisitionDate !== undefined) {
      if (validatedData.acquisitionDate === null) {
        acquisitionDate = null;
      } else if (typeof validatedData.acquisitionDate === 'string') {
        acquisitionDate = new Date(validatedData.acquisitionDate);
      } else {
        acquisitionDate = validatedData.acquisitionDate;
      }
    }

    // Update asset
    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        ...validatedData,
        acquisitionDate,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_ASSET',
        entityType: 'Asset',
        entityId: id,
        details: JSON.stringify(validatedData),
        userId: session.userId,
        familyId: session.familyId!,
      },
    });

    return NextResponse.json({
      message: 'Aset berhasil diperbarui',
      asset: updatedAsset,
    });
  } catch (error) {
    console.error('Update asset error:', error);

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
        error: 'Terjadi kesalahan saat memperbarui aset',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assets/[id]
 * 
 * Delete an asset
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

    // Find asset
    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, familyId: true, name: true, value: true },
    });

    if (!asset) {
      return NextResponse.json(
        {
          error: 'Aset tidak ditemukan',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate family access
    await validateFamilyAccess(session, asset.familyId);

    // Delete asset
    await prisma.asset.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_ASSET',
        entityType: 'Asset',
        entityId: id,
        details: JSON.stringify({
          name: asset.name,
          value: asset.value,
        }),
        userId: session.userId,
        familyId: session.familyId!,
      },
    });

    return NextResponse.json({
      message: 'Aset berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete asset error:', error);

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
        error: 'Terjadi kesalahan saat menghapus aset',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
