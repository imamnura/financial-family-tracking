import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';

/**
 * GET /api/categories
 * 
 * Get all categories for the user's family
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/categories');
 * const categories = await response.json();
 * ```
 */
export async function GET() {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

        // Fetch categories for user's family
    const categories = await prisma.category.findMany({
      where: {
        familyId: session.familyId!,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        icon: true,
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);

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
        error: 'Terjadi kesalahan saat mengambil data kategori',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
