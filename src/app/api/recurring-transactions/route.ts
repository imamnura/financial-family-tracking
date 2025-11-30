import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";

/**
 * Recurring Transaction Schema
 */
const RecurringTransactionSchema = z.object({
  name: z.string().min(1, "Nama harus diisi").max(100),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  dayOfWeek: z.number().min(0).max(6).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  fromWalletId: z.string().uuid().optional().nullable(),
  toWalletId: z.string().uuid().optional().nullable(),
});

type RecurringTransactionInput = z.infer<typeof RecurringTransactionSchema>;

/**
 * Calculate next execution date based on frequency
 */
function calculateNextDate(
  startDate: Date,
  frequency: string,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const next = new Date(startDate);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      if (dayOfMonth) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(
          Math.min(
            dayOfMonth,
            new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
          )
        );
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

/**
 * GET /api/recurring-transactions
 *
 * Get all recurring transactions for family
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: any = {
      familyId: session.familyId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            type: true,
          },
        },
        fromWallet: {
          select: {
            id: true,
            name: true,
          },
        },
        toWallet: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        nextDate: "asc",
      },
    });

    return NextResponse.json({ recurringTransactions });
  } catch (error) {
    console.error("GET /api/recurring-transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recurring transactions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recurring-transactions
 *
 * Create a new recurring transaction
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId || !session?.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = RecurringTransactionSchema.parse(body);

    const startDate =
      typeof validatedData.startDate === "string"
        ? new Date(validatedData.startDate)
        : validatedData.startDate;

    const nextDate = calculateNextDate(
      startDate,
      validatedData.frequency,
      validatedData.dayOfMonth,
      validatedData.dayOfWeek
    );

    const recurringTransaction = await prisma.recurringTransaction.create({
      data: {
        name: validatedData.name,
        amount: validatedData.amount,
        type: validatedData.type,
        description: validatedData.description,
        notes: validatedData.notes,
        frequency: validatedData.frequency,
        startDate,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        nextDate,
        dayOfMonth: validatedData.dayOfMonth,
        dayOfWeek: validatedData.dayOfWeek,
        familyId: session.familyId,
        categoryId: validatedData.categoryId,
        fromWalletId: validatedData.fromWalletId,
        toWalletId: validatedData.toWalletId,
        createdById: session.userId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            type: true,
          },
        },
        fromWallet: {
          select: {
            id: true,
            name: true,
          },
        },
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
        action: "CREATE_RECURRING",
        entityType: "RecurringTransaction",
        entityId: recurringTransaction.id,
        changes: JSON.stringify({
          name: validatedData.name,
          amount: validatedData.amount,
          frequency: validatedData.frequency,
          type: validatedData.type,
        }),
      },
    });

    return NextResponse.json({ recurringTransaction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("POST /api/recurring-transactions error:", error);
    return NextResponse.json(
      { error: "Failed to create recurring transaction" },
      { status: 500 }
    );
  }
}
