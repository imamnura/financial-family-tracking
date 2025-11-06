import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Asset Creation Schema
 */
const CreateAssetSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama aset tidak boleh kosong')
    .max(200, 'Nama aset maksimal 200 karakter')
    .trim(),
  type: z.enum(['PROPERTY', 'VEHICLE', 'SAVINGS', 'INVESTMENT', 'OTHER'], {
    errorMap: () => ({ message: 'Tipe aset tidak valid' }),
  }),
  value: z
    .number()
    .nonnegative('Nilai aset tidak boleh negatif')
    .max(999999999999, 'Nilai aset terlalu besar'),
  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .optional(),
  acquisitionDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid' })
    .or(z.date())
    .optional(),
});

type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

/**
 * GET /api/assets
 * 
 * Get all assets for the user's family
 */
export async function GET() {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Fetch assets
    const assets = await prisma.asset.findMany({
      where: {
        familyId: session.familyId!,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate total value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalValue = assets.reduce((sum: number, asset: any) => sum + asset.value, 0);

    return NextResponse.json({
      assets,
      summary: {
        total: assets.length,
        totalValue,
      },
    });
  } catch (error) {
    console.error('Get assets error:', error);

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
        error: 'Terjadi kesalahan saat mengambil data aset',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets
 * 
 * Create a new asset
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Parse and validate request body
    const body = await request.json();
    const validatedData: CreateAssetInput = CreateAssetSchema.parse(body);

    const { name, type, value, description, acquisitionDate } = validatedData;

    // Convert date string to Date object if provided
    const assetDate = acquisitionDate
      ? typeof acquisitionDate === 'string'
        ? new Date(acquisitionDate)
        : acquisitionDate
      : undefined;

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        name,
        type,
        value,
        description: description || null,
        acquisitionDate: assetDate || null,
        familyId: session.familyId!,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_ASSET',
        entityType: 'Asset',
        entityId: asset.id,
        details: JSON.stringify({
          name,
          type,
          value,
        }),
        userId: session.userId,
        familyId: session.familyId!,
      },
    });

    return NextResponse.json(
      {
        message: 'Aset berhasil ditambahkan',
        asset,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create asset error:', error);

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
        error: 'Terjadi kesalahan saat menambahkan aset',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
