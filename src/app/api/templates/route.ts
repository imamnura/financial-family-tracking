import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  fromWalletId: z.string().uuid().optional().nullable(),
  toWalletId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/templates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const templates = await prisma.transactionTemplate.findMany({
      where: {
        familyId: session.familyId,
        ...(type && { type: type as "INCOME" | "EXPENSE" }),
      },
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
      orderBy: [
        { usageCount: "desc" },
        { lastUsedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateTemplateSchema.parse(body);

    const template = await prisma.transactionTemplate.create({
      data: {
        ...validatedData,
        familyId: session.familyId,
        createdById: session.userId,
      },
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
        action: "CREATE_TEMPLATE",
        entityType: "TransactionTemplate",
        entityId: template.id,
        changes: JSON.stringify({
          name: template.name,
          type: template.type,
          amount: template.amount,
        }),
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("POST /api/templates error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
