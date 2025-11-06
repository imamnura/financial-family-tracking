import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireFamily } from '@/lib/auth';
import { PrismaErrorHandler } from '@/lib/prisma-helpers';

/**
 * Invite Schema
 */
const InviteSchema = z.object({
  email: z
    .string()
    .email('Email tidak valid')
    .toLowerCase()
    .trim(),
});

type InviteInput = z.infer<typeof InviteSchema>;

/**
 * POST /api/family/invite
 * 
 * Invite a new family member (ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await requireAuth();
    
    // Ensure user has a family
    await requireFamily(session);

    // Check if user is ADMIN
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'Hanya admin yang dapat mengundang anggota keluarga',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData: InviteInput = InviteSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true, familyId: true },
    });

    if (existingUser) {
      if (existingUser.familyId === session.familyId) {
        return NextResponse.json(
          {
            error: 'Email ini sudah menjadi anggota keluarga Anda',
            code: 'ALREADY_MEMBER',
          },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          {
            error: 'Email ini sudah terdaftar di keluarga lain',
            code: 'USER_EXISTS',
          },
          { status: 400 }
        );
      }
    }

    // Get family info
    const family = await prisma.family.findUnique({
      where: { id: session.familyId! },
      select: { id: true, name: true },
    });

    if (!family) {
      return NextResponse.json(
        {
          error: 'Keluarga tidak ditemukan',
          code: 'FAMILY_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Generate unique invitation token
    const token = randomUUID();

    // Create invitation with token
    const invitation = await prisma.familyInvite.create({
      data: {
        email: validatedData.email,
        token,
        familyId: session.familyId!,
        senderId: session.userId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'INVITE_MEMBER',
        entityType: 'FamilyInvite',
        entityId: invitation.id,
        details: JSON.stringify({ email: validatedData.email, token }),
        userId: session.userId,
        familyId: session.familyId!,
      },
    });

    // Generate invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    // TODO: Send invitation email with inviteLink
    // For now, we'll just return the link
    // In production, you would send an email with the link

    return NextResponse.json(
      {
        message: 'Undangan berhasil dibuat',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          token: invitation.token,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          inviteLink,
        },
        // In production, this would be sent via email
        note: 'Untuk MVP, salin link undangan ini dan kirimkan ke email yang diundang. Dalam produksi, link akan dikirim otomatis via email.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Invite member error:', error);

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
        error: 'Terjadi kesalahan saat mengirim undangan',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
