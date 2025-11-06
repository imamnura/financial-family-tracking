import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Accept Invitation Schema
 */
const AcceptInvitationSchema = z.object({
  invitationId: z.string().uuid('ID undangan tidak valid'),
});

type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

/**
 * POST /api/family/accept-invitation
 * 
 * Accept a family invitation (used during registration or by existing users)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData: AcceptInvitationInput = AcceptInvitationSchema.parse(body);

    // Find invitation
    const invitation = await prisma.familyInvite.findUnique({
      where: { id: validatedData.invitationId },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        {
          error: 'Undangan tidak ditemukan',
          code: 'INVITATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: 'Undangan sudah digunakan atau dibatalkan',
          code: 'INVITATION_INVALID',
        },
        { status: 400 }
      );
    }

    // Check if invitation is expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: 'Undangan sudah kadaluarsa',
          code: 'INVITATION_EXPIRED',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Undangan valid',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        familyId: invitation.familyId,
        familyName: invitation.family.name,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);

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
        error: 'Terjadi kesalahan saat memvalidasi undangan',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
