import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * GET /api/family/validate-invitation/[token]
 * 
 * Validate a family invitation token
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  try {
    const { token } = params;

    // Find invitation by token
    const invitation = await prisma.familyInvite.findUnique({
      where: { token },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        sender: {
          select: {
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
          error: `Undangan sudah ${invitation.status === 'ACCEPTED' ? 'digunakan' : 'dibatalkan'}`,
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
        inviterName: invitation.sender.name,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Validate invitation error:', error);

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
