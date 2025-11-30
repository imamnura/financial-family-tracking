import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/notifications/reminders
 * Get reminder schedules
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user || !user.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    const familyId = user.familyId!;

    const reminders = await prisma.reminderSchedule.findMany({
      where: { familyId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Separate by status
    const active = reminders.filter((r) => r.enabled);
    const inactive = reminders.filter((r) => !r.enabled);

    // Group by type
    const byType = reminders.reduce((acc: any, r) => {
      if (!acc[r.notificationType]) acc[r.notificationType] = [];
      acc[r.notificationType].push(r);
      return acc;
    }, {});

    return NextResponse.json({
      reminders,
      active,
      inactive,
      byType,
      total: reminders.length,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/reminders
 * Create a new reminder schedule
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user || !user.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      frequency,
      dayOfWeek,
      dayOfMonth,
      time,
      notificationType,
      emailEnabled,
      inAppEnabled,
      criteria,
    } = body;

    if (!name || !frequency || !time || !notificationType) {
      return NextResponse.json(
        { error: "name, frequency, time, and notificationType are required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;

    // Calculate next run time
    const nextRunAt = calculateNextRun(frequency, dayOfWeek, dayOfMonth, time);

    const reminder = await prisma.reminderSchedule.create({
      data: {
        name,
        description,
        frequency,
        dayOfWeek: dayOfWeek || null,
        dayOfMonth: dayOfMonth || null,
        time,
        notificationType,
        emailEnabled: emailEnabled !== false,
        inAppEnabled: inAppEnabled !== false,
        criteria,
        nextRunAt,
        userId: user.userId,
        familyId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      reminder,
      message: "Reminder schedule created successfully",
    });
  } catch (error: any) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/reminders
 * Update reminder schedule
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user || !user.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reminderId, enabled, ...updateData } = body;

    if (!reminderId) {
      return NextResponse.json(
        { error: "reminderId is required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;

    // Verify ownership
    const existing = await prisma.reminderSchedule.findFirst({
      where: { id: reminderId, familyId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    // Recalculate next run if schedule changed
    let nextRunAt = existing.nextRunAt;
    if (
      updateData.frequency ||
      updateData.dayOfWeek !== undefined ||
      updateData.dayOfMonth !== undefined ||
      updateData.time
    ) {
      nextRunAt = calculateNextRun(
        updateData.frequency || existing.frequency,
        updateData.dayOfWeek !== undefined
          ? updateData.dayOfWeek
          : existing.dayOfWeek,
        updateData.dayOfMonth !== undefined
          ? updateData.dayOfMonth
          : existing.dayOfMonth,
        updateData.time || existing.time
      );
    }

    const reminder = await prisma.reminderSchedule.update({
      where: { id: reminderId },
      data: {
        ...updateData,
        enabled: enabled !== undefined ? enabled : existing.enabled,
        nextRunAt,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      reminder,
      message: "Reminder updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/reminders
 * Delete reminder schedule
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user || !user.familyId) {
      return NextResponse.json(
        { error: "Unauthorized or no family" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get("id");

    if (!reminderId) {
      return NextResponse.json(
        { error: "reminderId is required" },
        { status: 400 }
      );
    }

    const familyId = user.familyId!;

    await prisma.reminderSchedule.delete({
      where: {
        id: reminderId,
        familyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to calculate next run time
function calculateNextRun(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  time: string
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);

  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case "daily":
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case "weekly":
      if (dayOfWeek !== null) {
        const currentDay = nextRun.getDay();
        let daysToAdd = dayOfWeek - currentDay;
        if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
          daysToAdd += 7;
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd);
      }
      break;

    case "monthly":
      if (dayOfMonth !== null) {
        nextRun.setDate(dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      }
      break;

    default:
      // For custom frequency, default to next day
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
  }

  return nextRun;
}
