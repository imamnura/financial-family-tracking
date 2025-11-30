import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";

const UpdateRecurringSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  fromWalletId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/recurring-transactions/[id]
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

    const recurring = await prisma.recurringTransaction.findUnique({
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

    if (!recurring || recurring.familyId !== session.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ recurring });
  } catch (error) {
    console.error("GET /api/recurring-transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

/**
 * PUT /api/recurring-transactions/[id]
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
    const validatedData = UpdateRecurringSchema.parse(body);

    const existing = await prisma.recurringTransaction.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...validatedData,
        endDate: validatedData.endDate
          ? new Date(validatedData.endDate)
          : undefined,
      },
      include: {
        category: true,
        fromWallet: true,
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
        action: "UPDATE_RECURRING",
        entityType: "RecurringTransaction",
        entityId: id,
        changes: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({ recurring: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("PUT /api/recurring-transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/**
 * DELETE /api/recurring-transactions/[id]
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

    const existing = await prisma.recurringTransaction.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.recurringTransaction.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        action: "DELETE_RECURRING",
        entityType: "RecurringTransaction",
        entityId: id,
        changes: JSON.stringify({
          name: existing.name,
          amount: existing.amount,
        }),
      },
    });

    return NextResponse.json({ message: "Recurring transaction deleted" });
  } catch (error) {
    console.error("DELETE /api/recurring-transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
