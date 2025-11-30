import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  fromWalletId: z.string().uuid().optional().nullable(),
  toWalletId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/templates/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.transactionTemplate.findUnique({
      where: { id },
      include: {
        category: true,
        fromWallet: true,
        toWallet: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!template || template.familyId !== session.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("GET /api/templates/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

/**
 * PUT /api/templates/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateTemplateSchema.parse(body);

    const existing = await prisma.transactionTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.transactionTemplate.update({
      where: { id },
      data: validatedData,
      include: {
        category: true,
        fromWallet: true,
        toWallet: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        action: "UPDATE_TEMPLATE",
        entityType: "TransactionTemplate",
        entityId: id,
        changes: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({ template: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("PUT /api/templates/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/**
 * DELETE /api/templates/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.transactionTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.transactionTemplate.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        action: "DELETE_TEMPLATE",
        entityType: "TransactionTemplate",
        entityId: id,
        changes: JSON.stringify({
          name: existing.name,
          usageCount: existing.usageCount,
        }),
      },
    });

    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    console.error("DELETE /api/templates/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
