import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * GET /api/family/members
 * 
 * Get all family members (ADMIN only)
 */
export async function GET() {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Check if user is ADMIN
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'Hanya admin yang dapat melihat daftar anggota keluarga',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Get family members
    const members = await prisma.user.findMany({
      where: {
        familyId: session.familyId!,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' }, // ADMIN first
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({
      members,
      total: members.length,
    });
  } catch (error) {
    console.error('Get family members error:', error);

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
        error: 'Terjadi kesalahan saat mengambil data anggota keluarga',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
