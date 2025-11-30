import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
 * POST /api/cron/execute-recurring
 * Background job to execute due recurring transactions
 * Should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      processed: 0,
      created: 0,
      completed: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // Find all active recurring transactions that are due
    const dueRecurrings = await prisma.recurringTransaction.findMany({
      where: {
        status: "ACTIVE",
        nextDate: {
          lte: now,
        },
      },
      include: {
        family: true,
      },
    });

    console.log(
      `[Cron] Found ${dueRecurrings.length} recurring transactions to process`
    );

    // Process each recurring transaction
    for (const recurring of dueRecurrings) {
      try {
        results.processed++;

        // Check if end date has passed
        if (recurring.endDate && recurring.endDate < now) {
          await prisma.recurringTransaction.update({
            where: { id: recurring.id },
            data: { status: "COMPLETED" },
          });
          results.completed++;
          console.log(
            `[Cron] Completed recurring ${recurring.id} - end date reached`
          );
          continue;
        }

        // Create transaction
        const transactionData = {
          type: recurring.type,
          amount: recurring.amount,
          description:
            recurring.description ?? `${recurring.name} (Auto-generated)`,
          notes: recurring.notes ?? "",
          date: now,
          categoryId: recurring.categoryId,
          fromWalletId: recurring.fromWalletId,
          toWalletId: recurring.toWalletId,
          familyId: recurring.familyId,
          userId: recurring.createdById,
        };

        // Calculate next execution date
        const nextDate = calculateNextDate(
          now,
          recurring.frequency,
          recurring.dayOfMonth,
          recurring.dayOfWeek
        );

        // Check if next date exceeds end date
        const shouldComplete =
          recurring.endDate && nextDate > recurring.endDate;

        // Prepare update data
        const updateData: any = {
          lastRunDate: now,
          status: shouldComplete ? "COMPLETED" : "ACTIVE",
        };

        if (!shouldComplete) {
          updateData.nextDate = nextDate;
        }

        // Execute in transaction
        const [transaction, updatedRecurring] = await prisma.$transaction([
          prisma.transaction.create({
            data: transactionData,
          }),
          prisma.recurringTransaction.update({
            where: { id: recurring.id },
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
            userId: recurring.createdById,
            familyId: recurring.familyId,
            action: "AUTO_EXECUTE_RECURRING",
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

        results.created++;
        if (shouldComplete) results.completed++;

        console.log(
          `[Cron] Created transaction ${transaction.id} from recurring ${
            recurring.id
          }. Next: ${nextDate.toISOString()}`
        );
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push({ id: recurring.id, error: errorMessage });
        console.error(
          `[Cron] Failed to process recurring ${recurring.id}:`,
          error
        );
      }
    }

    console.log("[Cron] Execution completed:", results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("[Cron] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/execute-recurring
 * Check status of recurring transactions (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const stats = await prisma.recurringTransaction.groupBy({
      by: ["status"],
      _count: true,
    });

    const dueCount = await prisma.recurringTransaction.count({
      where: {
        status: "ACTIVE",
        nextDate: {
          lte: now,
        },
      },
    });

    const upcoming = await prisma.recurringTransaction.findMany({
      where: {
        status: "ACTIVE",
        nextDate: {
          gt: now,
        },
      },
      select: {
        id: true,
        name: true,
        nextDate: true,
        frequency: true,
      },
      orderBy: {
        nextDate: "asc",
      },
      take: 10,
    });

    return NextResponse.json({
      timestamp: now.toISOString(),
      stats,
      dueCount,
      upcomingNext10: upcoming,
    });
  } catch (error) {
    console.error("[Cron] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
