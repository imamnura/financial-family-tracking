import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { setAuthCookie } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Registration Request Schema
 */
const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .trim(),
  email: z
    .string()
    .email('Format email tidak valid')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password harus mengandung huruf besar, huruf kecil, dan angka'
    ),
  invitationId: z.string().uuid().optional(), // Optional invitation ID
  token: z.string().uuid().optional(), // Optional invitation token
});

type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Default Categories for New Family
 */
const DEFAULT_CATEGORIES = [
  {
    name: 'Makan & Minum',
    description: 'Pengeluaran untuk makanan dan minuman',
    type: 'EXPENSE' as const,
    icon: '🍽️',
  },
  {
    name: 'Transport',
    description: 'Biaya transportasi dan bahan bakar',
    type: 'EXPENSE' as const,
    icon: '🚗',
  },
  {
    name: 'Tagihan',
    description: 'Tagihan rutin (listrik, air, internet, dll)',
    type: 'EXPENSE' as const,
    icon: '📄',
  },
  {
    name: 'Belanja',
    description: 'Belanja kebutuhan rumah tangga',
    type: 'EXPENSE' as const,
    icon: '🛒',
  },
  {
    name: 'Kesehatan',
    description: 'Biaya kesehatan dan obat-obatan',
    type: 'EXPENSE' as const,
    icon: '⚕️',
  },
  {
    name: 'Pendidikan',
    description: 'Biaya sekolah dan pendidikan',
    type: 'EXPENSE' as const,
    icon: '📚',
  },
  {
    name: 'Hiburan',
    description: 'Hiburan dan rekreasi',
    type: 'EXPENSE' as const,
    icon: '🎬',
  },
  {
    name: 'Gaji',
    description: 'Pendapatan dari gaji',
    type: 'INCOME' as const,
    icon: '💰',
  },
  {
    name: 'Bonus',
    description: 'Bonus dan tunjangan',
    type: 'INCOME' as const,
    icon: '🎁',
  },
  {
    name: 'Investasi',
    description: 'Pendapatan dari investasi',
    type: 'INCOME' as const,
    icon: '📈',
  },
  {
    name: 'Lainnya',
    description: 'Kategori lainnya',
    type: 'EXPENSE' as const,
    icon: '📦',
  },
];

/**
 * POST /api/auth/register
 * 
 * Register new user with automatic family, wallet, and categories setup
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/auth/register', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     name: 'John Doe',
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
    const validatedData: RegisterInput = RegisterSchema.parse(body);

    const { name, email, password, invitationId, token } = validatedData;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'Email sudah terdaftar',
          code: 'EMAIL_EXISTS',
        },
        { status: 400 }
      );
    }

    // If invitationId or token is provided, validate it
    let invitation = null;
    if (invitationId) {
      invitation = await prisma.familyInvite.findUnique({
        where: { id: invitationId },
      });
    } else if (token) {
      invitation = await prisma.familyInvite.findUnique({
        where: { token },
      });
    }

    if ((invitationId || token) && !invitation) {
      return NextResponse.json(
        {
          error: 'Undangan tidak ditemukan',
          code: 'INVITATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (invitation) {
      if (invitation.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'Undangan sudah digunakan atau dibatalkan',
            code: 'INVITATION_INVALID',
          },
          { status: 400 }
        );
      }

      if (invitation.expiresAt && invitation.expiresAt < new Date()) {
        return NextResponse.json(
          {
            error: 'Undangan sudah kadaluarsa',
            code: 'INVITATION_EXPIRED',
          },
          { status: 400 }
        );
      }

      if (invitation.email !== email) {
        return NextResponse.json(
          {
            error: 'Email tidak sesuai dengan undangan',
            code: 'EMAIL_MISMATCH',
          },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with family, wallet, and categories in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let family: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let user: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let wallet: any;
      let categoriesCreated = 0;

      if (invitation) {
        // Join existing family via invitation
        family = await tx.family.findUnique({
          where: { id: invitation.familyId },
        });

        if (!family) {
          throw new Error('Keluarga tidak ditemukan');
        }

        // Create User (Member)
        user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: 'MEMBER',
            familyId: family.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            familyId: true,
            createdAt: true,
          },
        });

        // Update invitation status
        await tx.familyInvite.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            receiverId: user.id,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: 'ACCEPT_INVITATION',
            entityType: 'FamilyInvite',
            entityId: invitation.id,
            details: JSON.stringify({ email, userId: user.id }),
            userId: user.id,
            familyId: family.id,
          },
        });

        // Get existing wallet (don't create new one)
        wallet = await tx.wallet.findFirst({
          where: { familyId: family.id },
        });
      } else {
        // Create new family (original flow)
        // 1. Create Family
        family = await tx.family.create({
          data: {
            name: `Keluarga ${name}`,
            description: `Keluarga dari ${name}`,
          },
        });

        // 2. Create User (Admin)
        user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: 'ADMIN',
            familyId: family.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            familyId: true,
            createdAt: true,
          },
        });

        // 3. Create Default Wallet
        wallet = await tx.wallet.create({
          data: {
            name: 'Dompet Utama',
            description: 'Dompet utama keluarga',
            balance: 0,
            familyId: family.id,
          },
        });

        // 4. Create Default Categories
        const categories = await tx.category.createMany({
          data: DEFAULT_CATEGORIES.map((category) => ({
            ...category,
            familyId: family.id,
          })),
        });

        categoriesCreated = categories.count;
      }

      return {
        user,
        family,
        wallet,
        categoriesCreated,
        joinedExistingFamily: !!invitation,
      };
    });

    // Set authentication cookie
    await setAuthCookie({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      familyId: result.user.familyId,
    });

    // Return success response
    return NextResponse.json(
      {
        message: result.joinedExistingFamily 
          ? 'Berhasil bergabung dengan keluarga'
          : 'Registrasi berhasil',
        user: result.user,
        family: {
          id: result.family.id,
          name: result.family.name,
        },
        ...(result.wallet && {
          wallet: {
            id: result.wallet.id,
            name: result.wallet.name,
          },
        }),
        ...(result.categoriesCreated > 0 && {
          categoriesCreated: result.categoriesCreated,
        }),
        joinedExistingFamily: result.joinedExistingFamily,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

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
        error: 'Terjadi kesalahan saat registrasi',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
