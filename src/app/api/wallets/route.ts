import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';

/**
 * GET /api/wallets
 * 
 * Get all wallets for the user's family
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/wallets');
 * const wallets = await response.json();
 * ```
 */
export async function GET() {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

        // Fetch wallets for user's family
    const wallets = await prisma.wallet.findMany({
      where: {
        familyId: session.familyId!,
      },
      select: {
        id: true,
        name: true,
        description: true,
        balance: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(wallets);
  } catch (error) {
    console.error('Get wallets error:', error);

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
        error: 'Terjadi kesalahan saat mengambil data dompet',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
