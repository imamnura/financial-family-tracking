import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { setAuthCookie } from '@/lib/auth';

/**
 * Login Request Schema
 */
const LoginSchema = z.object({
  email: z
    .string()
    .email('Format email tidak valid')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password tidak boleh kosong'),
});

type LoginInput = z.infer<typeof LoginSchema>;

/**
 * POST /api/auth/login
 * 
 * Login user with email and password
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/auth/login', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     email: 'john@example.com',
 *     password: 'SecurePass123'
 *   })
 * });
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData: LoginInput = LoginSchema.parse(body);

    const { email, password } = validatedData;

    // Find user by email (include password for verification)
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        familyId: true,
        password: true, // Include password for comparison
        createdAt: true,
        updatedAt: true,
        family: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        {
          error: 'Email atau password salah',
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: 'Email atau password salah',
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    // Set authentication cookie
    await setAuthCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // Return success response
    return NextResponse.json(
      {
        message: 'Login berhasil',
        user: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);

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

    // Handle generic errors
    return NextResponse.json(
      {
        error: 'Terjadi kesalahan saat login',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
