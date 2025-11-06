import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * 
 * Logout user by clearing authentication cookie
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/auth/logout', {
 *   method: 'POST',
 * });
 * ```
 */
export async function POST() {
  try {
    // Clear authentication cookie
    await clearAuthCookie();

    // Return success response
    return NextResponse.json(
      {
        message: 'Logout berhasil',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);

    // Handle generic errors
    return NextResponse.json(
      {
        error: 'Terjadi kesalahan saat logout',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
