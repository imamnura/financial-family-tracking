import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";

const UseTemplateSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime().or(z.date()).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  fromWalletId: z.string().uuid().optional().nullable(),
  toWalletId: z.string().uuid().optional().nullable(),
});

/**
 * POST /api/templates/[id]/use
 * Create a transaction from template
 */
export async function POST(
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
    const overrides = UseTemplateSchema.parse(body);

    const template = await prisma.transactionTemplate.findUnique({
      where: { id },
    });

    if (!template || template.familyId !== session.familyId) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Create transaction with template data + overrides
    const transactionData = {
      type: template.type,
      amount: overrides.amount ?? template.amount ?? 0,
      description: overrides.description ?? template.description ?? "",
      notes: overrides.notes ?? template.notes ?? "",
      date: overrides.date ? new Date(overrides.date) : new Date(),
      categoryId:
        overrides.categoryId !== undefined
          ? overrides.categoryId
          : template.categoryId,
      fromWalletId:
        overrides.fromWalletId !== undefined
          ? overrides.fromWalletId
          : template.fromWalletId,
      toWalletId:
        overrides.toWalletId !== undefined
          ? overrides.toWalletId
          : template.toWalletId,
      familyId: session.familyId,
      userId: session.userId,
    };

    // Validate wallet requirement
    if (template.type === "EXPENSE" && !transactionData.fromWalletId) {
      return NextResponse.json(
        { error: "fromWalletId required for expense transactions" },
        { status: 400 }
      );
    }
    if (template.type === "INCOME" && !transactionData.toWalletId) {
      return NextResponse.json(
        { error: "toWalletId required for income transactions" },
        { status: 400 }
      );
    }

    // Create transaction and update template in a transaction
    const [transaction, updatedTemplate] = await prisma.$transaction([
      prisma.transaction.create({
        data: transactionData,
        include: {
          category: true,
          fromWallet: true,
          toWallet: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.transactionTemplate.update({
        where: { id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      }),
    ]);

    // Update wallet balance
    if (template.type === "EXPENSE" && transactionData.fromWalletId) {
      await prisma.wallet.update({
        where: { id: transactionData.fromWalletId },
        data: { balance: { decrement: transactionData.amount } },
      });
    } else if (template.type === "INCOME" && transactionData.toWalletId) {
      await prisma.wallet.update({
        where: { id: transactionData.toWalletId },
        data: { balance: { increment: transactionData.amount } },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        action: "USE_TEMPLATE",
        entityType: "Transaction",
        entityId: transaction.id,
        changes: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
          amount: transactionData.amount,
        }),
      },
    });

    return NextResponse.json(
      {
        transaction,
        template: {
          ...updatedTemplate,
          usageCount: updatedTemplate.usageCount,
          lastUsedAt: updatedTemplate.lastUsedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("POST /api/templates/[id]/use error:", error);
    return NextResponse.json(
      { error: "Failed to use template" },
      { status: 500 }
    );
  }
}
