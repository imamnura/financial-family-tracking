import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

const AcceptInviteSchema = z.object({
  token: z.string().uuid('Token tidak valid'),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { token } = AcceptInviteSchema.parse(body);

    // Validate invitation
    const invitation = await prisma.familyInvite.findUnique({
      where: { token },
      include: {
        family: true,
        sender: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Undangan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Undangan sudah tidak berlaku' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json(
        { error: 'Undangan sudah kedaluwarsa' },
        { status: 400 }
      );
    }

    if (invitation.email !== session.email) {
      return NextResponse.json(
        { error: 'Email tidak sesuai dengan undangan' },
        { status: 403 }
      );
    }

    // Check if user already in a family
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { familyId: true },
    });

    if (currentUser?.familyId && currentUser.familyId !== invitation.familyId) {
      return NextResponse.json(
        { error: 'Anda sudah bergabung dengan keluarga lain' },
        { status: 400 }
      );
    }

    // Accept invitation in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // Update user's familyId
      const updatedUser = await tx.user.update({
        where: { id: session.userId },
        data: { familyId: invitation.familyId },
      });

      // Update invitation status
      await tx.familyInvite.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          receiverId: session.userId,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'ACCEPT_INVITATION',
          entityType: 'FamilyInvite',
          entityId: invitation.id,
          changes: {
            familyId: invitation.familyId,
            familyName: invitation.family.name,
            invitedBy: invitation.sender.name,
          },
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      message: 'Berhasil bergabung dengan keluarga',
      familyId: result.familyId,
      familyName: invitation.family.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menerima undangan' },
      { status: 500 }
    );
  }
}
