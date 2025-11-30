import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";

/**
 * Calculate next execution date based on frequency
 */
function calculateNextDate(
  currentDate: Date,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;

    case "WEEKLY":
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 7);
      }
      break;

    case "MONTHLY":
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
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
 * POST /api/recurring-transactions/[id]/execute
 * Manually execute a recurring transaction
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

    const recurring = await prisma.recurringTransaction.findUnique({
      where: { id },
    });

    if (!recurring || recurring.familyId !== session.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (recurring.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Recurring transaction is not active" },
        { status: 400 }
      );
    }

    // Check if end date has passed
    if (recurring.endDate && recurring.endDate < new Date()) {
      await prisma.recurringTransaction.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
      return NextResponse.json(
        { error: "Recurring transaction has ended" },
        { status: 400 }
      );
    }

    // Create transaction
    const transactionData = {
      type: recurring.type,
      amount: recurring.amount,
      description: recurring.description ?? `${recurring.name} (Recurring)`,
      notes: recurring.notes ?? "",
      date: new Date(),
      categoryId: recurring.categoryId,
      fromWalletId: recurring.fromWalletId,
      toWalletId: recurring.toWalletId,
      familyId: session.familyId,
      userId: session.userId,
    };

    // Calculate next execution date
    const nextDate = calculateNextDate(
      new Date(),
      recurring.frequency,
      recurring.dayOfMonth,
      recurring.dayOfWeek
    );

    // Check if next date exceeds end date
    const shouldComplete = recurring.endDate && nextDate > recurring.endDate;

    // Execute in transaction
    const updateData: any = {
      lastRunDate: new Date(),
      status: shouldComplete ? "COMPLETED" : "ACTIVE",
    };

    if (!shouldComplete) {
      updateData.nextDate = nextDate;
    }

    // Execute in transaction
    const [transaction, updatedRecurring] = await prisma.$transaction([
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
      prisma.recurringTransaction.update({
        where: { id },
        data: updateData,
      }),
    ]);

    // Update wallet balances
    if (recurring.type === "EXPENSE" && transactionData.fromWalletId) {
      await prisma.wallet.update({
        where: { id: transactionData.fromWalletId },
        data: { balance: { decrement: transactionData.amount } },
      });
    } else if (recurring.type === "INCOME" && transactionData.toWalletId) {
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
        action: "EXECUTE_RECURRING",
        entityType: "Transaction",
        entityId: transaction.id,
        changes: JSON.stringify({
          recurringId: recurring.id,
          recurringName: recurring.name,
          amount: transactionData.amount,
          nextDate: shouldComplete ? null : nextDate,
          completed: shouldComplete,
        }),
      },
    });

    return NextResponse.json(
      {
        transaction,
        recurring: updatedRecurring,
        completed: shouldComplete,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/recurring-transactions/[id]/execute error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to execute recurring transaction" },
      { status: 500 }
    );
  }
}
